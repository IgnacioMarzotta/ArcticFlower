import { Component, OnInit, HostListener } from '@angular/core';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { CommonModule } from '@angular/common';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { RouterLink } from '@angular/router';

//Mas adelante puede usarse para elegir la posicion de la leyenda del grafico dependiendo del tamaño de la pantalla, por ahora se mantiene unicamente abajo
export enum LegendPosition {
  Right = 'right',
  Below = 'below'
}

//Estructura de las cards de conclusion
interface CardItem {
  img: string;
  text: string;
  url: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, NgxChartsModule, NgxTypedJsModule]
})

export class HomeComponent implements OnInit {

  view: [number, number] = [700, 400];
  legendPosition: LegendPosition = LegendPosition.Below;
  items: CardItem[] = 
  [
    { 
      img: "../../../assets/img/landing/gbif.png",
      text: "International organization funded by governments around the world, designed to provide anyone, anywhere, with free and open access to data about every type of life form on Earth. ArcticFlower would not be possible without them ❤️.",
      url: "https://www.gbif.org/become-member" 
    },
    { 
      img: "../../../assets/img/landing/greenpeace.png",
      text: "International environmental NGO. It campaigns worldwide on issues such as organic farming, forests, climate change, combating consumerism, promoting democracy and countervailing power, disarmament and peace, and ocean stewardship.",
      url: "https://www.greenpeace.org/global/" 
    },
    { 
      img: "../../../assets/img/landing/iucn.jpg",
      text: "Inventory of the global conservation status and extinction risk of biological species. A series of Regional Red Lists, which assess the risk of extinction to species within a political management unit, are also produced by countries and organizations. ArcticFlower would not be possible without them ❤️.",
      url: "https://www.iucnredlist.org/support/donate" 
    },
    { 
      img: "../../../assets/img/landing/wcs.png",
      text: "American NGO whose mission is to conserve vast wilderness areas through applied science, concrete conservation actions, and education. WCS operates in more than 60 countries worldwide, and its marine conservation program extends to 23 countries across all five oceans.",
      url: "https://www.wcs.org/get-involved" 
    },
    { 
      img: "../../../assets/img/landing/unep.jpg",
      text: "As a member of the United Nations Development Group, UNEP aims to help the world achieve the 17 Sustainable Development Goals.",
      url: "https://www.unep.org/get-involved" 
    },
    { 
      img: "../../../assets/img/landing/ocean.png",
      text: "Nonprofit environmental advocacy group based in the United States. The organization seeks to promote healthy and diverse ocean ecosystems, prevent marine pollution, climate change and advocates against practices that threaten oceanic and human life.",
      url: "https://oceanconservancy.org/action-center/" 
    },
    { 
      img: "../../../assets/img/landing/conservation.png",
      text: "Since 1987, Conservation International has combined fieldwork with innovations in science, policy and finance to secure the critical benefits that nature provides to humanity.",
      url: "https://www.conservation.org/act" 
    },
    { 
      img: "../../../assets/img/landing/conservancy.png",
      text: "The Nature Conservancy has over one million members globally as of 2021 and has protected more than 119 million acres (48 million ha) of land in its history. As of 2014, it is the largest environmental non-profit organization by assets and revenue in the Americas.",
      url: "https://www.nature.org/en-us/get-involved/how-to-help/" 
    },
    { 
      img: "../../../assets/img/landing/birdlife.png",
      text: "International organization dedicated to the protection of birds and their habitats. It is a federation of democratic and independent associations whose mission is the conservation and study of birds. BirdLife International's global network currently has representatives in more than 100 countries.",
      url: "https://www.birdlife.org/world-bird-club/" 
    },
    { 
      img: "../../../assets/img/landing/african.png",
      text: "International conservation organization created with the intent of preserving Africa's wildlife, wild lands, and natural resources. The Foundation works with governments and businesses to develop conservation efforts as a source of revenue.",
      url: "https://www.awf.org/" 
    },
    { 
      img: "../../../assets/img/landing/xr.jpg",
      text: "International movement that uses nonviolent direct action and civil disobedience to urge governments to act on the climate and ecological emergency.",
      url: "https://rebellion.global/get-involved/"
    },
    { 
      img: "../../../assets/img/landing/350.png",
      text: "International environmental organization addressing the climate crisis. Its stated goal is to end the use of fossil fuels and transition to renewable energy by building a global, grassroots movement.",
      url: "https://350.org/get-involved/" 
    },
  ];
  pageSize = 3;
  currentPage = 1;

  graph1Data = [
    {
      "name": "Amphibians",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0,"name": "1600"},
        {"value": 0,"name": "1700"},
        {"value": 0,"name": "1800"},
        {"value": 0.1,"name": "1900"},
        {"value": 0.46,"name": "2018"},
      ]
    },
    {
      "name": "Mammals",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0,"name": "1600"},
        {"value": 0.2,"name": "1700"},
        {"value": 0.5,"name": "1800"},
        {"value": 1,"name": "1900"},
        {"value": 1.4,"name": "2018"},
      ]
    },
    {
      "name": "Birds",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0.1,"name": "1600"},
        {"value": 0.4,"name": "1700"},
        {"value": 0.8,"name": "1800"},
        {"value": 1.3,"name": "1900"},
        {"value": 1.7,"name": "2018"},
      ]
    },
    {
      "name": "Reptiles",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0.02,"name": "1600"},
        {"value": 0.1,"name": "1700"},
        {"value": 0.2,"name": "1800"},
        {"value": 0.2,"name": "1900"},
        {"value": 0.3,"name": "2018"},
      ]
    },
    {
      "name": "Fishes",
      "series": [
        {"value": 0,"name": "1500"},
        {"value": 0,"name": "1600"},
        {"value": 0,"name": "1700"},
        {"value": 0,"name": "1800"},
        {"value": 0.1,"name": "1900"},
        {"value": 0.3,"name": "2018"},
      ]
    },
  ];

  graph2Data = [
    {
      "name": "Latin America and the Caribbean",
      "series": [
        {"value": 1,"name": "1970"},
        {"value": 0.7,"name": "1980"},
        {"value": 0.5,"name": "1990"},
        {"value": 0.3,"name": "2000"},
        {"value": 0.1,"name": "2010"},
        {"value": 0.05,"name": "2020"},
      ]
    },
        {
      "name": "Africa",
      "series": [
        {"value": 1,"name": "1970"},
        {"value": 0.8,"name": "1980"},
        {"value": 0.65,"name": "1990"},
        {"value": 0.5,"name": "2000"},
        {"value": 0.3,"name": "2010"},
        {"value": 0.24,"name": "2020"},
      ]
    },
    {
      "name": "Asia-Pacific",
      "series": [
        {"value": 1,"name": "1970"},
        {"value": 0.85,"name": "1980"},
        {"value": 0.75,"name": "1990"},
        {"value": 0.65,"name": "2000"},
        {"value": 0.50,"name": "2010"},
        {"value": 0.40,"name": "2020"},
      ]
    },
    {
      "name": "North America",
      "series": [
        {"value": 1,"name": "1970"},
        {"value": 0.9,"name": "1980"},
        {"value": 0.85,"name": "1990"},
        {"value": 0.8,"name": "2000"},
        {"value": 0.75,"name": "2010"},
        {"value": 0.61,"name": "2020"},
      ]
    },
    {
      "name": "Europe and Central Asia",
      "series": [
        {"value": 1,"name": "1970"},
        {"value": 0.95,"name": "1980"},
        {"value": 0.9,"name": "1990"},
        {"value": 0.85,"name": "2000"},
        {"value": 0.8,"name": "2010"},
        {"value": 0.65,"name": "2020"},
      ]
    },
    
  ];

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

  constructor() { }

  ngOnInit(): void {
    this.adjustChartSize();
    this.updatePageSize(window.innerWidth);
    window.addEventListener('resize', () => this.adjustChartSize());
  }

  private adjustChartSize(): void {
    const containerWidth = document.querySelector('.chart-container')?.clientWidth || 700;
    this.view = [Math.min(containerWidth - 40, 1000), 400];
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updatePageSize(event.target.innerWidth);
  }

  private updatePageSize(width: number) {
    const newSize = width < 768 ? 1 : 3;
    if (newSize !== this.pageSize) {
      this.pageSize = newSize;
      const maxPage = this.totalPages;
      if (this.currentPage > maxPage) {
        this.currentPage = maxPage;
      }
    }
  }

  get totalPages(): number {
    return Math.ceil(this.items.length / this.pageSize);
  }

  get pagedItems(): CardItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }
  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
}