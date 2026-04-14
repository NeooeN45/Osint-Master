import ExifReader from "exifreader";
import type { 
  ExifData, 
  ImageAIAnalysis, 
  FaceAnalysis, 
  FaceDescriptor, 
  FacePattern,
  DetectedObject 
} from "../types";

// Generate thumbnail from image
export async function generateThumbnail(dataUrl: string, maxWidth = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Extract EXIF data from image
export async function extractExifData(file: File | ArrayBuffer): Promise<ExifData | null> {
  try {
    let tags: Record<string, unknown>;
    
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      tags = await ExifReader.load(arrayBuffer);
    } else {
      tags = await ExifReader.load(file);
    }

    const gps = tags.GPSInfo as { latitude?: number; longitude?: number; altitude?: number } | undefined;
    const exif = tags.Exif as { DateTimeOriginal?: string; Make?: string; Model?: string } | undefined;
    const image = tags.Image as { ImageWidth?: number; ImageLength?: number; Orientation?: number; Software?: string } | undefined;

    return {
      camera: exif?.Make && exif?.Model ? `${exif.Make} ${exif.Model}` : undefined,
      lens: tags.LensModel as string | undefined,
      dateTaken: exif?.DateTimeOriginal,
      gpsLatitude: gps?.latitude,
      gpsLongitude: gps?.longitude,
      gpsAltitude: gps?.altitude,
      software: image?.Software,
      resolution: image?.ImageWidth && image?.ImageLength 
        ? `${image.ImageWidth}x${image.ImageLength}` 
        : undefined,
      orientation: image?.Orientation,
      make: exif?.Make,
      model: exif?.Model,
      allTags: tags,
    };
  } catch (error) {
    console.error("EXIF extraction error:", error);
    return null;
  }
}

// Calculate file hash
export async function calculateFileHash(file: File | ArrayBuffer): Promise<string> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Simple face detection simulation (placeholder for real face-api.js)
export async function detectFaces(dataUrl: string): Promise<FaceAnalysis> {
  // This is a placeholder - in production, use face-api.js or similar
  // For now, return simulated data based on image analysis
  
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  // Simulate basic face detection
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  
  ctx.drawImage(img, 0, 0);
  
  // Placeholder: randomly detect 0-3 faces for demonstration
  const facesDetected = Math.floor(Math.random() * 3);
  const faceDescriptors: FaceDescriptor[] = [];
  const patterns: FacePattern[] = [];
  
  for (let i = 0; i < facesDetected; i++) {
    const encoding = Array.from({ length: 128 }, () => Math.random());
    faceDescriptors.push({
      id: `face_${i}_${Date.now()}`,
      encoding,
      bbox: [100 + i * 50, 100, 200 + i * 50, 300],
      confidence: 0.7 + Math.random() * 0.25,
      landmarks: {
        leftEye: [120 + i * 50, 150],
        rightEye: [180 + i * 50, 150],
        nose: [150 + i * 50, 200],
        mouth: [150 + i * 50, 250],
      },
    });
  }

  return {
    facesDetected,
    faceDescriptors,
    patterns,
    ageEstimate: facesDetected > 0 ? 25 + Math.floor(Math.random() * 40) : undefined,
    genderEstimate: facesDetected > 0 ? (Math.random() > 0.5 ? "male" : "female") : undefined,
    emotions: facesDetected > 0 ? {
      neutral: 0.4 + Math.random() * 0.3,
      happy: Math.random() * 0.3,
      sad: Math.random() * 0.1,
      angry: Math.random() * 0.1,
      surprised: Math.random() * 0.1,
    } : undefined,
  };
}

// Analyze image with Mistral Vision API
export async function analyzeImageWithMistral(
  dataUrl: string, 
  apiKey: string
): Promise<ImageAIAnalysis> {
  // Remove data URL prefix
  const base64Image = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "pixtral-12b-latest",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image in detail. Identify: 1) All visible objects and their locations, 2) Any text visible, 3) People and their activities, 4) Vehicles and license plates if visible, 5) Location indicators, 6) Any suspicious or notable elements. Return structured data." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  
  // Parse the response to extract structured data
  const objects: DetectedObject[] = [];
  const text: string[] = [];
  const locations: string[] = [];
  const people: string[] = [];
  const vehicles: string[] = [];
  
  // Extract objects from response (simple parsing)
  const objectMatches = content.match(/-\s*([^:]+):\s*(\d+)%/g);
  if (objectMatches) {
    objectMatches.forEach((match: string) => {
      const parts = match.replace("- ", "").split(":");
      if (parts.length === 2) {
        objects.push({
          label: parts[0].trim(),
          confidence: parseInt(parts[1]) / 100,
        });
      }
    });
  }

  return {
    description: content,
    objects,
    text,
    locations,
    people,
    vehicles,
    confidence: 0.85,
    rawResponse: content,
    analyzedAt: new Date().toISOString(),
  };
}

// Find similar images based on visual features
export async function findSimilarImages(
  targetImageId: string,
  allImages: { id: string; dataUrl: string; faceAnalysis?: FaceAnalysis | null }[]
): Promise<string[]> {
  const target = allImages.find(img => img.id === targetImageId);
  if (!target?.faceAnalysis?.faceDescriptors?.length) return [];

  const similar: string[] = [];
  
  for (const img of allImages) {
    if (img.id === targetImageId) continue;
    if (!img.faceAnalysis?.faceDescriptors?.length) continue;

    // Compare face descriptors
    const hasMatch = target.faceAnalysis.faceDescriptors.some(targetFace =>
      img.faceAnalysis!.faceDescriptors.some(face => {
        const distance = Math.sqrt(
          face.encoding.reduce((sum, val, i) => 
            sum + Math.pow(val - (targetFace.encoding[i] ?? 0), 2), 0
          )
        );
        return distance < 0.6;
      })
    );
    
    if (hasMatch) similar.push(img.id);
  }
  
  return similar;
}

// Generate face pattern analysis
export async function analyzeFacePatterns(
  imageId: string,
  faceAnalysis: FaceAnalysis,
  allImages: { id: string; faceAnalysis?: FaceAnalysis | null }[]
): Promise<FacePattern[]> {
  const patterns: FacePattern[] = [];
  
  if (!faceAnalysis.faceDescriptors.length) return patterns;
  
  // Check for similar faces in other images
  for (const img of allImages) {
    if (img.id === imageId) continue;
    if (!img.faceAnalysis?.faceDescriptors?.length) continue;
    
    const similarities = [];
    
    for (const face of faceAnalysis.faceDescriptors) {
      for (const otherFace of img.faceAnalysis.faceDescriptors) {
        const distance = Math.sqrt(
          face.encoding.reduce((sum, val, i) => 
            sum + Math.pow(val - (otherFace.encoding[i] ?? 0), 2), 0
          )
        );
        similarities.push(distance);
      }
    }
    
    const minDistance = Math.min(...similarities);
    if (minDistance < 0.5) {
      patterns.push({
        patternId: `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: "face_recognition",
        confidence: 1 - minDistance,
        relatedImages: [img.id],
        description: `Face match found across images (distance: ${minDistance.toFixed(3)})`,
      });
    }
  }
  
  return patterns;
}
