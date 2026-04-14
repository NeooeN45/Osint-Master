// ============================================================================
// OLLAMA AI SERVICE
// Local AI integration for OSINT analysis
// ============================================================================

import axios from "axios";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
}

class OllamaService {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = OLLAMA_URL;
    this.defaultModel = process.env.OLLAMA_MODEL || "dolphin-mistral";
  }

  // Check if Ollama is running
  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  // List available models
  async listModels(): Promise<string[]> {
    try {
      const res = await axios.get<{ models: { name: string }[] }>(`${this.baseUrl}/api/tags`);
      return res.data.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }

  // Chat completion
  async chat(
    messages: OllamaMessage[],
    model?: string
  ): Promise<{ content: string; model: string; duration: number }> {
    const useModel = model || this.defaultModel;

    try {
      const res = await axios.post<{ message?: { content: string }; total_duration?: number }>(
        `${this.baseUrl}/api/chat`,
        { model: useModel, messages, stream: false, options: { temperature: 0.3, num_predict: 4096 } },
        { timeout: 120000 }
      );

      return {
        content: res.data.message?.content || "",
        model: useModel,
        duration: res.data.total_duration || 0,
      };
    } catch (error: any) {
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }

  // Stream chat for real-time responses
  async *chatStream(
    messages: OllamaMessage[],
    model?: string
  ): AsyncGenerator<string> {
    const useModel = model || this.defaultModel;

    const res = await axios.post(
      `${this.baseUrl}/api/chat`,
      { model: useModel, messages, stream: true, options: { temperature: 0.3, num_predict: 4096 } },
      { timeout: 120000 }
    );

    const stream = res.data as any;
    for await (const chunk of stream) {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch { /* skip malformed */ }
      }
    }
  }

  // Analyze OSINT data with AI
  async analyzeOSINT(data: any, context: string): Promise<string> {
    const systemPrompt = `Tu es un analyste OSINT expert de niveau professionnel. Tu analyses des donnees de renseignement en source ouverte et tu produis des rapports structures, precis et exploitables.

Regles:
- Identifie les entites (personnes, organisations, lieux, comptes)
- Trouve les correlations et liens entre entites
- Evalue la fiabilite des sources
- Signale les anomalies et points d'interet
- Structure tes reponses en sections claires
- Utilise un ton professionnel et factuel
- Propose des pistes d'investigation supplementaires`;

    const result = await this.chat([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Contexte: ${context}\n\nDonnees a analyser:\n${JSON.stringify(data, null, 2)}`,
      },
    ]);

    return result.content;
  }

  // Generate investigation plan
  async generateInvestigationPlan(
    target: string,
    targetType: string,
    knownInfo: string
  ): Promise<string> {
    const result = await this.chat([
      {
        role: "system",
        content: `Tu es un expert OSINT. Genere un plan d'investigation structure pour la cible donnee. Le plan doit inclure:
1. Les outils OSINT a utiliser et dans quel ordre
2. Les sources de donnees a consulter
3. Les correlations a rechercher
4. Les risques et precautions
Reponds en JSON avec la structure: { steps: [{ tool, target, description, priority }], sources: [], correlations: [] }`,
      },
      {
        role: "user",
        content: `Cible: ${target}\nType: ${targetType}\nInfos connues: ${knownInfo}`,
      },
    ]);

    return result.content;
  }

  // Correlate findings
  async correlateFindings(findings: any[]): Promise<string> {
    const result = await this.chat([
      {
        role: "system",
        content: `Tu es un analyste OSINT. Analyse les resultats de plusieurs outils OSINT et identifie:
1. Les entites communes trouvees par plusieurs sources
2. Les liens et correlations entre entites
3. Les informations contradictoires
4. Un score de confiance pour chaque correlation
5. Un resume executif
Reponds en JSON: { entities: [], correlations: [], contradictions: [], confidence: number, summary: string }`,
      },
      {
        role: "user",
        content: `Resultats a correler:\n${JSON.stringify(findings, null, 2)}`,
      },
    ]);

    return result.content;
  }
}

export const ollamaService = new OllamaService();
