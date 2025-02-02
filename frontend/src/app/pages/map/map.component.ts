import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import * as THREE from 'three';
const Globe = require('globe.gl').default;

interface PointData {
  lat: number;
  lng: number;
  label: string;
  color?: string;
  size?: number;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit {
  @ViewChild('globeContainer') globeContainer!: ElementRef;

  ngAfterViewInit(): void {
    this.createGlobe();
  }

  private createGlobe(): void {
    // Datos de ejemplo con tipado fuerte
    const sampleData: PointData[] = [
      { lat: 40.7128, lng: -74.0060, label: 'Nueva York', color: '#ff0000', size: 0.2 },
      { lat: 51.5074, lng: -0.1278, label: 'Londres', color: '#0000ff', size: 0.2 }
    ];

    // Crear instancia del globo
    const globe = Globe();
    
    // Configuración del globo
    globe(this.globeContainer.nativeElement)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .pointsData(sampleData)
      .pointLabel((d: PointData) => d.label)
      .pointRadius((d: PointData) => d.size || 0.1)
      .pointColor((d: PointData) => d.color || '#ffff00');
  }
}