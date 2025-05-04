import { Component, OnInit } from '@angular/core';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { CommonModule } from '@angular/common';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, NgxChartsModule, NgxTypedJsModule]
})
export class HomeComponent implements OnInit {

  view: [number, number] = [700, 400];

  graph1Data = [
    {
      "name": "Amphibians",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0,"name": "1600"},
        {"value": 0,"name": "1700"},
        {"value": 0,"name": "1800"},
        {"value": 0.3,"name": "1900"},
        {"value": 2.4,"name": "2018"},
      ]
    },
    {
      "name": "Mammals",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0.4,"name": "1600"},
        {"value": 0.45,"name": "1700"},
        {"value": 0.5,"name": "1800"},
        {"value": 1,"name": "1900"},
        {"value": 1.9,"name": "2018"},
      ]
    },
    {
      "name": "Birds",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0.1,"name": "1600"},
        {"value": 0.3,"name": "1700"},
        {"value": 0.5,"name": "1800"},
        {"value": 0.9,"name": "1900"},
        {"value": 1.65,"name": "2018"},
      ]
    },
    {
      "name": "Reptiles",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0.04,"name": "1600"},
        {"value": 0.07,"name": "1700"},
        {"value": 0.1,"name": "1800"},
        {"value": 0.5,"name": "1900"},
        {"value": 1.1,"name": "2018"},
      ]
    },
    {
      "name": "Fishes",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0,"name": "1600"},
        {"value": 0,"name": "1700"},
        {"value": 0,"name": "1800"},
        {"value": 0.03,"name": "1900"},
        {"value": 0.93,"name": "2018"},
      ]
    },
  ];

  graph1Scheme: Color = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#FF5733', '#33FF57', '#3357FF', '#F39C12', '#9B59B6']
  };

  graph2Data = [
    {"name": "Reef Corals", "value": "44"},
    {"name": "Amphibians", "value": "41"},
    {"name": "Trees", "value": "38"},
    {"name": "Shark and rays", "value": "37"},
    {"name": "Mammals", "value": "27"},
    {"name": "Freshwater fishes", "value": "26"},
    {"name": "Reptiles", "value": "21"},
    {"name": "Selected Insects", "value": "16"},
    {"name": "Birds", "value": "12"},
  ];

  graph2Scheme: Color = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#FF5733', '#33FF57', '#3357FF', '#F39C12', '#9B59B6']
  };

  graph3Data = [
    {"name": "Fish", "value": "4017"},
    {"name": "Amphibians", "value": "2873"},
    {"name": "Molluscus (e.g. Snails)", "value": "2456"},
    {"name": "Insects", "value": "2423"},
    {"name": "Reptiles", "value": "1845"},
    {"name": "Mammals", "value": "1354"},
    {"name": "Birds", "value": "1311"},
    {"name": "Others*", "value": "1533"},
  ];

  graph3Scheme: Color = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#FF5733', '#33FF57', '#3357FF', '#F39C12', '#9B59B6']
  };

  constructor() { } // Eliminado HttpClient

  ngOnInit(): void {
    this.adjustChartSize();
    window.addEventListener('resize', () => this.adjustChartSize());
  }

  private adjustChartSize(): void {
    const containerWidth = document.querySelector('.chart-container')?.clientWidth || 700;
    this.view = [Math.min(containerWidth - 40, 1000), 400];
  }
}