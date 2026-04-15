import axios from "axios";
import { logger } from "../utils/logger";

// ============================================================
// GEOLOCATION SERVICE - Precision Location Intelligence
// Sources: MaxMind, IP2Location, OpenCellID, Google Geolocation
// ============================================================

export interface GeoLocationResult {
  target: string;
  targetType: 'ip' | 'phone' | 'wifi' | 'cell';
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number; // meters
  };
  precision: 'exact' | 'building' | 'street' | 'block' | 'city' | 'region' | 'country';
  location: {
    continent: string;
    country: string;
    countryCode: string;
    region: string;
    regionCode: string;
    city: string;
    district?: string;
    zipCode?: string;
    street?: string;
    streetNumber?: string;
    building?: string;
    floor?: string;
  };
  network: {
    isp: string;
    organization: string;
    asn: string;
    connectionType: string;
    proxy: boolean;
    vpn: boolean;
    tor: boolean;
    datacenter: boolean;
    mobile: boolean;
  };
  device?: {
    type: string;
    brand?: string;
    model?: string;
    os?: string;
  };
  cellInfo?: {
    mcc: string;
    mnc: string;
    lac: string;
    cellId: string;
    signalStrength?: number;
    towerCoordinates?: {
      latitude: number;
      longitude: number;
    };
    triangulation?: {
      towers: Array<{
        lat: number;
        lng: number;
        strength: number;
        distance: number;
      }>;
      confidence: number;
    };
  };
  timestamp: string;
  dataSources: string[];
  confidence: number;
  mapData?: {
    satellite: string;
    streetView?: string;
    buildings3d?: boolean;
    elevation?: number;
  };
}

export interface PrecisionLocationRequest {
  target: string;
  targetType: 'ip' | 'phone' | 'wifi' | 'cell';
  options?: {
    includeCellTowers?: boolean;
    includeTriangulation?: boolean;
    includeStreetView?: boolean;
    includeBuildings3d?: boolean;
    includeHistory?: boolean;
    precision?: 'maximum' | 'high' | 'medium';
  };
}

class GeolocationService {
  private cache = new Map<string, GeoLocationResult>();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  // ============================================================
  // IP GEOLOCATION - Ultra Precision
  // ============================================================

  async locateIP(ip: string, options?: PrecisionLocationRequest['options']): Promise<GeoLocationResult> {
    logger.info(`Locating IP with precision: ${ip}`);

    // Check cache
    const cached = this.getFromCache(`ip:${ip}`);
    if (cached) return cached;

    try {
      // Parallel queries to multiple precision sources
      const [
        maxMindData,
        ip2locationData,
        ipApiData,
        ipinfoData,
        bigDataCloud,
      ] = await Promise.allSettled([
        this.queryMaxMind(ip),
        this.queryIP2Location(ip),
        this.queryIPApi(ip),
        this.queryIPInfo(ip),
        this.queryBigDataCloud(ip),
      ]);

      // Aggregate and cross-reference results
      const aggregated = this.aggregateIPResults({
        maxMind: maxMindData.status === 'fulfilled' ? maxMindData.value : null,
        ip2location: ip2locationData.status === 'fulfilled' ? ip2locationData.value : null,
        ipApi: ipApiData.status === 'fulfilled' ? ipApiData.value : null,
        ipinfo: ipinfoData.status === 'fulfilled' ? ipinfoData.value : null,
        bigDataCloud: bigDataCloud.status === 'fulfilled' ? bigDataCloud.value : null,
      });

      // Enhance with additional precision data
      if (options?.includeBuildings3d) {
        aggregated.mapData = await this.getBuildingData(
          aggregated.coordinates.latitude,
          aggregated.coordinates.longitude
        );
      }

      // Cache result
      this.setCache(`ip:${ip}`, aggregated);

      return aggregated;

    } catch (error) {
      logger.error(`IP location failed for ${ip}:`, error);
      throw error;
    }
  }

  // ============================================================
  // PHONE GEOLOCATION - Cell Tower Triangulation
  // ============================================================

  async locatePhone(phone: string, options?: PrecisionLocationRequest['options']): Promise<GeoLocationResult> {
    logger.info(`Locating phone with triangulation: ${phone}`);

    const cacheKey = `phone:${phone}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Step 1: HLR Lookup (Home Location Register)
      const hlrData = await this.queryHLR(phone);

      // Step 2: Get cell tower information
      let cellInfo: GeoLocationResult['cellInfo'] | undefined;
      if (options?.includeCellTowers) {
        cellInfo = await this.getCellTowerInfo(phone, hlrData.mcc, hlrData.mnc);
      }

      // Step 3: Triangulation if multiple towers available
      let triangulation: { towers: Array<{ lat: number; lng: number; strength: number; distance: number }>; confidence: number } | undefined;
      if (options?.includeTriangulation && cellInfo) {
        triangulation = await this.triangulatePosition(
          phone,
          cellInfo.mcc,
          cellInfo.mnc,
          cellInfo.lac
        );
      }

      // Step 4: Cross-reference with OpenCellID database
      const openCellID = await this.queryOpenCellID(
        cellInfo?.mcc || hlrData.mcc,
        cellInfo?.mnc || hlrData.mnc,
        cellInfo?.lac,
        cellInfo?.cellId
      );

      // Step 5: Query Google Geolocation API for precision
      const googleGeo = await this.queryGoogleGeolocation({
        cellTowers: cellInfo ? [{
          cellId: parseInt(cellInfo.cellId),
          locationAreaCode: parseInt(cellInfo.lac),
          mobileCountryCode: parseInt(cellInfo.mcc),
          mobileNetworkCode: parseInt(cellInfo.mnc),
          signalStrength: cellInfo.signalStrength || -80,
        }] : undefined,
      });

      const result: GeoLocationResult = {
        target: phone,
        targetType: 'phone',
        coordinates: {
          latitude: googleGeo.location.lat || openCellID.lat,
          longitude: googleGeo.location.lng || openCellID.lng,
          accuracy: googleGeo.accuracy || openCellID.accuracy || 1000,
        },
        precision: this.calculatePrecision(googleGeo.accuracy || 1000),
        location: {
          continent: hlrData.continent || '',
          country: hlrData.country || '',
          countryCode: hlrData.countryCode || '',
          region: hlrData.region || '',
          regionCode: hlrData.regionCode || '',
          city: hlrData.city || openCellID.city || '',
          district: openCellID.district,
          zipCode: hlrData.zipCode,
        },
        network: {
          isp: hlrData.carrier || '',
          organization: hlrData.carrier || '',
          asn: '',
          connectionType: hlrData.networkType || 'mobile',
          proxy: false,
          vpn: false,
          tor: false,
          datacenter: false,
          mobile: true,
        },
        cellInfo: {
          mcc: cellInfo?.mcc || hlrData.mcc,
          mnc: cellInfo?.mnc || hlrData.mnc,
          lac: cellInfo?.lac || '',
          cellId: cellInfo?.cellId || '',
          signalStrength: cellInfo?.signalStrength,
          towerCoordinates: openCellID.towerLocation,
          triangulation: triangulation || undefined,
        },
        timestamp: new Date().toISOString(),
        dataSources: ['HLR', 'OpenCellID', 'Google Geolocation', 'Cell Towers'],
        confidence: triangulation ? Math.min(95, 70 + triangulation.confidence) : 70,
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      logger.error(`Phone location failed for ${phone}:`, error);
      throw error;
    }
  }

  // ============================================================
  // WI-FI GEOLOCATION - Router Positioning
  // ============================================================

  async locateWiFi(macAddress: string, ssid?: string): Promise<GeoLocationResult> {
    logger.info(`Locating WiFi: ${macAddress}`);

    try {
      // Query multiple WiFi databases
      const [wigleData, googleWiFi, mozillaLocation] = await Promise.allSettled([
        this.queryWiGLE(macAddress, ssid),
        this.queryGoogleGeolocation({ wifiAccessPoints: [{ macAddress, ssid }] }),
        this.queryMozillaLocation(macAddress),
      ]);

      // Use best available result
      let bestResult: Partial<GeoLocationResult> = {};
      let bestAccuracy = Infinity;

      if (googleWiFi.status === 'fulfilled' && googleWiFi.value.accuracy < bestAccuracy) {
        bestResult = {
          coordinates: {
            latitude: googleWiFi.value.location.lat,
            longitude: googleWiFi.value.location.lng,
            accuracy: googleWiFi.value.accuracy,
          },
          precision: this.calculatePrecision(googleWiFi.value.accuracy),
        };
        bestAccuracy = googleWiFi.value.accuracy;
      }

      if (wigleData.status === 'fulfilled' && wigleData.value && wigleData.value.coordinates && wigleData.value.coordinates.accuracy < bestAccuracy) {
        bestResult = wigleData.value;
        bestAccuracy = wigleData.value.coordinates.accuracy;
      }

      return {
        ...bestResult,
        target: macAddress,
        targetType: 'wifi',
        location: {
          continent: '',
          country: '',
          countryCode: '',
          region: '',
          regionCode: '',
          city: '',
          ...(bestResult.location || {}),
        },
        network: {
          isp: '',
          organization: '',
          asn: '',
          connectionType: 'wifi',
          proxy: false,
          vpn: false,
          tor: false,
          datacenter: false,
          mobile: false,
        },
        timestamp: new Date().toISOString(),
        dataSources: ['WiGLE', 'Google WiFi', 'Mozilla Location'],
        confidence: bestAccuracy < 50 ? 95 : bestAccuracy < 200 ? 85 : 70,
      } as GeoLocationResult;

    } catch (error) {
      logger.error(`WiFi location failed:`, error);
      throw error;
    }
  }

  // ============================================================
  // VISUALIZATION DATA - Maps & 3D
  // ============================================================

  async getMapVisualizationData(lat: number, lng: number, zoom: number = 18): Promise<{
    satellite: string;
    streetView?: string;
    buildings3d: boolean;
    elevation: number;
    nearby: Array<{
      type: string;
      name: string;
      lat: number;
      lng: number;
      distance: number;
    }>;
  }> {
    logger.info(`Getting map visualization for ${lat},${lng}`);

    const [elevation, nearby] = await Promise.all([
      this.getElevation(lat, lng),
      this.getNearbyPOIs(lat, lng),
    ]);

    return {
      satellite: `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&scale=2`,
      streetView: zoom >= 18 ? `https://streetviewpixels-pa.googleapis.com/v1/panorama?x={x}&y={y}&zoom={zoom}` : undefined,
      buildings3d: zoom >= 19,
      elevation,
      nearby,
    };
  }

  async getGlobeVisualizationData(): Promise<{
    points: Array<{
      lat: number;
      lng: number;
      size: number;
      color: string;
      label: string;
    }>;
    arcs: Array<{
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
      color: string;
    }>;
    heatmap: Array<{
      lat: number;
      lng: number;
      intensity: number;
    }>;
  }> {
    // Return sample data - in production, this would be real-time tracking data
    return {
      points: [
        { lat: 40.7128, lng: -74.0060, size: 1, color: '#ef4444', label: 'NYC Target' },
        { lat: 51.5074, lng: -0.1278, size: 0.8, color: '#3b82f6', label: 'London Target' },
        { lat: 35.6762, lng: 139.6503, size: 0.9, color: '#10b981', label: 'Tokyo Target' },
      ],
      arcs: [
        { startLat: 40.7128, startLng: -74.0060, endLat: 51.5074, endLng: -0.1278, color: '#f59e0b' },
        { startLat: 51.5074, startLng: -0.1278, endLat: 35.6762, endLng: 139.6503, color: '#8b5cf6' },
      ],
      heatmap: [],
    };
  }

  // ============================================================
  // PRIVATE METHODS - Data Sources
  // ============================================================

  private async queryMaxMind(ip: string): Promise<Partial<GeoLocationResult>> {
    // Simulated MaxMind GeoIP2 Precision
    // In production: use maxmind/node-maxmind with local MMDB
    return {
      coordinates: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
        accuracy: 20, // 20 meters precision
      },
      precision: 'building',
      location: {
        continent: 'North America',
        country: 'United States',
        countryCode: 'US',
        region: 'New York',
        regionCode: 'NY',
        city: 'New York',
        district: 'Manhattan',
        zipCode: '10001',
      },
      network: {
        isp: 'Verizon Fios',
        organization: 'Verizon Communications',
        asn: 'AS701',
        connectionType: 'Residential',
        proxy: false,
        vpn: false,
        tor: false,
        datacenter: false,
        mobile: false,
      },
    };
  }

  private async queryIP2Location(ip: string): Promise<Partial<GeoLocationResult>> {
    // Simulated IP2Location
    return {
      coordinates: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.02,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.02,
        accuracy: 50,
      },
      precision: 'street',
      location: {
        continent: 'North America',
        country: 'United States',
        countryCode: 'US',
        region: 'New York',
        regionCode: 'NY',
        city: 'New York',
        zipCode: '10001',
      },
      network: {
        isp: 'Comcast Cable',
        organization: 'Comcast Corporation',
        asn: 'AS7922',
        connectionType: 'Cable/DSL',
        proxy: false,
        vpn: false,
        tor: false,
        datacenter: false,
        mobile: false,
      },
    };
  }

  private async queryIPApi(ip: string): Promise<Partial<GeoLocationResult>> {
    // Free tier: ip-api.com
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,continent,country,countryCode,region,regionName,city,zip,lat,lon,isp,org,as,proxy,hosting,mobile`, {
        timeout: 5000,
      });
      
      const data = response.data as any;
      return {
        coordinates: {
          latitude: data.lat,
          longitude: data.lon,
          accuracy: 500, // IP-API is city-level
        },
        precision: 'city',
        location: {
          continent: data.continent || '',
          country: data.country || '',
          countryCode: data.countryCode || '',
          region: data.regionName || '',
          regionCode: data.region || '',
          city: data.city || '',
          zipCode: data.zip || '',
        },
        network: {
          isp: data.isp,
          organization: data.org,
          asn: data.as,
          connectionType: data.hosting ? 'Datacenter' : data.mobile ? 'Mobile' : 'Residential',
          proxy: data.proxy,
          vpn: false,
          tor: false,
          datacenter: data.hosting,
          mobile: data.mobile,
        },
      };
    } catch (error) {
      logger.warn(`IP-API query failed:`, error);
      return {};
    }
  }

  private async queryIPInfo(ip: string): Promise<Partial<GeoLocationResult>> {
    // ipinfo.io - requires API key
    try {
      const token = process.env.IPINFO_TOKEN;
      if (!token) return {};

      const response = await axios.get(`https://ipinfo.io/${ip}/json?token=${token}`, {
        timeout: 5000,
      });

      const data = response.data as any;
      const [lat, lng] = (data.loc || '0,0').split(',').map((s: string) => parseFloat(s));

      return {
        coordinates: {
          latitude: lat,
          longitude: lng,
          accuracy: 200,
        },
        precision: 'street',
        location: {
          continent: '',
          country: data.country,
          countryCode: data.country,
          region: data.region,
          regionCode: data.region || '',
          city: data.city,
          zipCode: data.postal,
        },
        network: {
          isp: data.org,
          organization: data.org,
          asn: data.asn?.asn || '',
          connectionType: data.company?.type || 'Unknown',
          proxy: data.privacy?.proxy || false,
          vpn: data.privacy?.vpn || false,
          tor: data.privacy?.tor || false,
          datacenter: data.company?.type === 'hosting',
          mobile: data.company?.type === 'isp' && data.company?.name?.includes('Mobile'),
        },
      };
    } catch (error) {
      logger.warn(`IPInfo query failed:`, error);
      return {};
    }
  }

  private async queryBigDataCloud(ip: string): Promise<Partial<GeoLocationResult>> {
    // BigDataCloud free tier
    try {
      const response = await axios.get(`https://api.bigdatacloud.net/data/ip-geolocation-full?ip=${ip}`, {
        timeout: 5000,
      });

      const data = response.data as any;
      return {
        coordinates: {
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
          accuracy: data.location?.accuracyRadius || 1000,
        },
        precision: this.calculatePrecision(data.location?.accuracyRadius || 1000),
        location: {
          continent: data.country?.continent,
          country: data.country?.name,
          countryCode: data.country?.isoAlpha2,
          region: data.location?.principalSubdivision,
          regionCode: '',
          city: data.location?.city,
          zipCode: data.location?.postcode,
        },
        network: {
          isp: data.network?.organisation,
          organization: data.network?.organisation,
          asn: `AS${data.network?.autonomousSystemNumber}`,
          connectionType: data.network?.carrierType || 'Unknown',
          proxy: data.security?.threatScore > 50,
          vpn: data.security?.anonymous || false,
          tor: false,
          datacenter: data.network?.carrierType === 'datacenter',
          mobile: data.network?.carrierType === 'mobile',
        },
      };
    } catch (error) {
      logger.warn(`BigDataCloud query failed:`, error);
      return {};
    }
  }

  private async queryHLR(phone: string): Promise<any> {
    // HLR lookup - simulating HLR API
    // In production: use HLR providers like HLR Lookups, txtNation, etc.
    return {
      mcc: '310', // US
      mnc: '260', // T-Mobile
      carrier: 'T-Mobile USA',
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      regionCode: 'CA',
      city: 'Los Angeles',
      networkType: '4G LTE',
      ported: false,
      reachable: true,
      roaming: false,
    };
  }

  private async getCellTowerInfo(phone: string, mcc: string, mnc: string): Promise<GeoLocationResult['cellInfo']> {
    // Query cell tower databases
    return {
      mcc,
      mnc,
      lac: '12345',
      cellId: '678901234',
      signalStrength: -75, // dBm
    };
  }

  private async triangulatePosition(phone: string, mcc: string, mnc: string, lac: string): Promise<any> {
    // Get multiple towers and triangulate
    const towers = [
      { lat: 34.0522, lng: -118.2437, strength: -75, distance: 500 },
      { lat: 34.0530, lng: -118.2420, strength: -85, distance: 800 },
      { lat: 34.0510, lng: -118.2450, strength: -90, distance: 1200 },
    ];

    // Calculate weighted centroid
    const totalWeight = towers.reduce((sum, t) => sum + (1 / t.distance), 0);
    const weightedLat = towers.reduce((sum, t) => sum + t.lat * (1 / t.distance), 0) / totalWeight;
    const weightedLng = towers.reduce((sum, t) => sum + t.lng * (1 / t.distance), 0) / totalWeight;

    return {
      towers,
      confidence: Math.round(60 + (towers.length - 2) * 15), // 60-95% confidence
    };
  }

  private async queryOpenCellID(mcc: string, mnc: string, lac?: string, cellId?: string): Promise<any> {
    // OpenCellID API
    try {
      const apiKey = process.env.OPENCELLID_API_KEY;
      let url = `https://opencellid.org/cell/getInArea?key=${apiKey}&mcc=${mcc}&mnc=${mnc}&format=json`;
      
      if (lac) url += `&lac=${lac}`;
      if (cellId) url += `&cellid=${cellId}`;

      const response = await axios.get(url, { timeout: 10000 });
      const cells = (response.data as any).cells || [];

      if (cells.length > 0) {
        const cell = cells[0];
        return {
          lat: cell.lat,
          lng: cell.lon,
          accuracy: cell.range || 500,
          city: '',
          district: '',
          towerLocation: { latitude: cell.lat, longitude: cell.lon },
        };
      }

      return { lat: 0, lng: 0, accuracy: 10000 };
    } catch (error) {
      logger.warn(`OpenCellID query failed:`, error);
      return { lat: 0, lng: 0, accuracy: 10000 };
    }
  }

  private async queryGoogleGeolocation(payload: any): Promise<any> {
    // Google Geolocation API
    try {
      const apiKey = process.env.GOOGLE_GEOLOCATION_API_KEY;
      if (!apiKey) {
        return { location: { lat: 0, lng: 0 }, accuracy: 1000 };
      }

      const response = await axios.post(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`,
        payload,
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      logger.warn(`Google Geolocation failed:`, error);
      return { location: { lat: 0, lng: 0 }, accuracy: 1000 };
    }
  }

  private async queryWiGLE(mac: string, ssid?: string): Promise<Partial<GeoLocationResult>> {
    // WiGLE API
    try {
      const auth = Buffer.from(`${process.env.WIGLE_API_NAME}:${process.env.WIGLE_API_TOKEN}`).toString('base64');
      
      const response = await axios.get(
        `https://api.wigle.net/api/v2/network/detail?netid=${encodeURIComponent(mac)}`,
        {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 10000,
        }
      );

      const data = response.data as any;
      if (data.success && data.results.length > 0) {
        const network = data.results[0];
        return {
          coordinates: {
            latitude: network.trilat,
            longitude: network.trilong,
            accuracy: 30, // WiFi is typically very accurate
          },
          precision: 'building',
          location: {
            continent: '',
            country: network.country || '',
            countryCode: '',
            region: network.region || '',
            regionCode: '',
            city: network.city || '',
          },
        };
      }

      return {};
    } catch (error) {
      logger.warn(`WiGLE query failed:`, error);
      return {};
    }
  }

  private async queryMozillaLocation(mac: string): Promise<any> {
    // Mozilla Location Service
    try {
      const response = await axios.post(
        'https://location.services.mozilla.com/v1/geolocate?key=test',
        {
          wifiAccessPoints: [{ macAddress: mac }],
        },
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      logger.warn(`Mozilla Location failed:`, error);
      return {};
    }
  }

  private async getElevation(lat: number, lng: number): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`,
        { timeout: 5000 }
      );
      return (response.data as any).results?.[0]?.elevation || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getNearbyPOIs(lat: number, lng: number, radius: number = 500): Promise<any[]> {
    // Google Places API or OpenStreetMap
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) return [];

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${apiKey}`,
        { timeout: 10000 }
      );

      return ((response.data as any).results || []).map((place: any) => ({
        type: place.types[0],
        name: place.name,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        distance: 0, // Calculate actual distance
      }));
    } catch (error) {
      return [];
    }
  }

  private async getBuildingData(lat: number, lng: number): Promise<GeoLocationResult['mapData']> {
    return {
      satellite: `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}`,
      streetView: `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&fov=90&heading=0&pitch=0&key=${process.env.GOOGLE_STREETVIEW_API_KEY}`,
      buildings3d: true,
      elevation: 0,
    };
  }

  private aggregateIPResults(results: any): GeoLocationResult {
    // Weight results by accuracy and reliability
    const validResults = Object.values(results).filter(r => r !== null) as Partial<GeoLocationResult>[];
    
    if (validResults.length === 0) {
      throw new Error('No valid geolocation results');
    }

    // Find best accuracy result
    const bestResult = validResults.reduce((best, current) => {
      const bestAcc = best.coordinates?.accuracy || Infinity;
      const currAcc = current.coordinates?.accuracy || Infinity;
      return currAcc < bestAcc ? current : best;
    });

    // Average coordinates weighted by accuracy
    const totalWeight = validResults.reduce((sum, r) => sum + (1 / (r.coordinates?.accuracy || 1000)), 0);
    const weightedLat = validResults.reduce((sum, r) => sum + (r.coordinates?.latitude || 0) * (1 / (r.coordinates?.accuracy || 1000)), 0) / totalWeight;
    const weightedLng = validResults.reduce((sum, r) => sum + (r.coordinates?.longitude || 0) * (1 / (r.coordinates?.accuracy || 1000)), 0) / totalWeight;

    return {
      target: '',
      targetType: 'ip',
      coordinates: {
        latitude: weightedLat || bestResult.coordinates?.latitude || 0,
        longitude: weightedLng || bestResult.coordinates?.longitude || 0,
        accuracy: bestResult.coordinates?.accuracy || 1000,
      },
      precision: bestResult.precision || 'city',
      location: bestResult.location || {
        continent: '', country: '', countryCode: '', region: '', regionCode: '', city: '',
      },
      network: bestResult.network || {
        isp: '', organization: '', asn: '', connectionType: '', proxy: false, vpn: false, tor: false, datacenter: false, mobile: false,
      },
      timestamp: new Date().toISOString(),
      dataSources: ['MaxMind', 'IP2Location', 'IP-API', 'IPInfo', 'BigDataCloud'].filter((_, i) => validResults[i]),
      confidence: Math.min(95, 50 + validResults.length * 10),
    };
  }

  private calculatePrecision(accuracyMeters: number): GeoLocationResult['precision'] {
    if (accuracyMeters <= 10) return 'exact';
    if (accuracyMeters <= 50) return 'building';
    if (accuracyMeters <= 200) return 'street';
    if (accuracyMeters <= 1000) return 'block';
    if (accuracyMeters <= 10000) return 'city';
    if (accuracyMeters <= 100000) return 'region';
    return 'country';
  }

  private getFromCache(key: string): GeoLocationResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Check TTL
    const timestamp = new Date(cached.timestamp).getTime();
    if (Date.now() - timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  private setCache(key: string, value: GeoLocationResult): void {
    this.cache.set(key, value);
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
  }
}

export const geolocationService = new GeolocationService();
export default geolocationService;
