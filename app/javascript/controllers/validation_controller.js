import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["map", "latInput", "lngInput", "linkInput"]
  static values = {
    lat: Number,
    lng: Number
  }

  connect() {
    this.initMap()
  }

  disconnect() {
    if (this.map) {
      this.map.remove()
    }
  }

  initMap() {
    const defaultLat = this.latValue || -14.235
    const defaultLng = this.lngValue || -51.925

    if (!this.hasMapTarget) return

    // Initialize Leaflet map
    this.map = L.map(this.mapTarget, {
      center: [defaultLat, defaultLng],
      zoom: 16,
      zoomControl: true
    })

    // Esri World Imagery Satellite Tile Layer
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }
    )

    esriSatellite.addTo(this.map)

    // Red draggable marker
    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    this.marker = L.marker([defaultLat, defaultLng], {
      draggable: true,
      icon: redIcon
    }).addTo(this.map)

    // Marker dragend event listener
    this.marker.on('dragend', (event) => {
      const position = event.target.getLatLng()
      this.updateInputs(position.lat, position.lng)
    })
  }

  updateInputs(lat, lng) {
    if (this.hasLatInputTarget) {
      this.latInputTarget.value = lat.toFixed(6)
    }

    if (this.hasLngInputTarget) {
      this.lngInputTarget.value = lng.toFixed(6)
    }
  }

  // Parse Google Maps URLs pasted into the link/message input via backend service
  async processLink() {
    if (!this.hasLinkInputTarget) return
    const input = this.linkInputTarget.value.trim()
    if (!input) return

    try {
      const csrfToken = document.querySelector("meta[name='csrf-token']")?.getAttribute("content")

      const response = await fetch('/validation/extract_coords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ url: input })
      })

      const data = await response.json()

      if (data.success && data.latitude && data.longitude) {
        const lat = parseFloat(data.latitude)
        const lng = parseFloat(data.longitude)

        this.updateInputs(lat, lng)

        if (this.marker) {
          this.marker.setLatLng([lat, lng])
        }

        if (this.map) {
          this.map.flyTo([lat, lng], 17)
        }
      }
    } catch (error) {
      console.error("Erro ao extrair coordenadas do link:", error)
    }
  }
}
