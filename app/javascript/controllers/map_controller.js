import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.initMap()
  }

  disconnect() {
    if (this.map) {
      this.map.remove()
    }
  }

  initMap() {
    // Default center on Brazil [-14.235, -51.925]
    this.map = L.map(this.element, {
      center: [-14.235, -51.925],
      zoom: 4,
      zoomControl: true
    })

    // 1. Esri World Imagery Satellite Tile Layer
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }
    )

    // 2. OpenStreetMap Standard Tile Layer
    const osmBase = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    )

    // Add satellite layer by default
    esriSatellite.addTo(this.map)

    // Basemaps control switcher top-right
    const baseMaps = {
      "Satélite Esri": esriSatellite,
      "OpenStreetMap": osmBase
    }
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.map)

    // Load locations JSON
    this.loadLocations()
  }

  async loadLocations() {
    try {
      const response = await fetch('/map/locations')
      if (!response.ok) throw new Error('Falha ao carregar pontos do mapa')

      const churches = await response.json()

      // Marker Cluster Group setup
      const markers = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
      })

      const bounds = L.latLngBounds()

      churches.forEach((church) => {
        if (!church.latitude || !church.longitude) return

        const lat = parseFloat(church.latitude)
        const lng = parseFloat(church.longitude)
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return

        bounds.extend([lat, lng])

        const marker = L.marker([lat, lng])
        marker.bindPopup(this.buildPopupContent(church))
        markers.addLayer(marker)
      })

      this.map.addLayer(markers)

      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] })
      }
    } catch (error) {
      console.error('Erro ao carregar marcadores do mapa:', error)
    }
  }

  buildPopupContent(church) {
    const nome = church.nome || church.desc_igreja || 'Igreja IPDA'
    const totvs = church.codigo_totvs || '-'
    const porte = church.porte || 'LOCAL'
    const endereco = church.endereco ? `${church.endereco}, ${church.bairro || ''} - ${church.municipio || ''}/${church.estado || ''}` : 'Endereço não informado'
    const statusText = church.validada ? 'VALIDADA' : 'PENDENTE'
    const statusBg = church.validada ? 'bg-emerald-500' : 'bg-amber-500'
    const googleMapsUrl = church.link_google_maps || `https://www.google.com/maps?q=${church.latitude},${church.longitude}`

    return `
      <div class="p-3 max-w-xs font-sans text-slate-900">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">TOTVS: ${totvs}</span>
          <span class="text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${statusBg}">${statusText}</span>
        </div>

        <h3 class="text-sm font-extrabold text-slate-900 leading-snug mb-1">${nome}</h3>

        <div class="mb-2">
          <span class="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">${porte}</span>
        </div>

        <p class="text-xs text-slate-600 mb-3 leading-relaxed">${endereco}</p>

        <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all">
          <span>Abrir no Google Maps</span>
        </a>
      </div>
    `
  }
}
