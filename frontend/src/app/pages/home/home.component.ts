import { Component, OnInit, HostListener } from '@angular/core';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { CommonModule } from '@angular/common';
import { NgxTypedJsModule } from 'ngx-typed-js';
import { RouterModule } from '@angular/router';

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
  imports: [CommonModule, NgxChartsModule, NgxTypedJsModule, RouterModule]
})

export class HomeComponent implements OnInit {

  view: [number, number] = [700, 400];
  legendPosition: LegendPosition = LegendPosition.Below;
  pageSize = 3;
  currentPage = 1;
  public showAboutModal = false;
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

  //Extinctions since 1500
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

  //Living Planet Index
  graph2Data = [
    {
      "name": "Africa", 
      "series": [
        {"name": "1970", "value": "100"},
        {"name": "1972", "value": "89.996994"},
        {"name": "1974", "value": "85.61314"},
        {"name": "1976", "value": "73.681283"},
        {"name": "1978", "value": "63.46199"},
        {"name": "1980", "value": "61.535764"},
        {"name": "1982", "value": "62.54752"},
        {"name": "1984", "value": "57.786286"},
        {"name": "1986", "value": "50.9055"},
        {"name": "1988", "value": "46.974334"},
        {"name": "1990", "value": "43.616715"},
        {"name": "1992", "value": "43.475807"},
        {"name": "1994", "value": "44.49087"},
        {"name": "1996", "value": "43.973678"},
        {"name": "1998", "value": "42.116538"},
        {"name": "2000", "value": "40.746465"},
        {"name": "2002", "value": "37.214458"},
        {"name": "2004", "value": "34.566407999999996"},
        {"name": "2006", "value": "32.03177"},
        {"name": "2008", "value": "32.298052"},
        {"name": "2010", "value": "31.544983"},
        {"name": "2012", "value": "29.082092999999997"},
        {"name": "2014", "value": "26.960372999999997"},
        {"name": "2016", "value": "25.596067"},
        {"name": "2018", "value": "25.256573999999997"},
        {"name": "2020", "value": "23.96703"}
      ]
    },
    {
      "name": "Asia and Pacific",
      "series": [
        {"name": "1970", "value": "100"},
        {"name": "1972", "value": "105.45609"},
        {"name": "1974", "value": "107.30608"},
        {"name": "1976", "value": "107.95983"},
        {"name": "1978", "value": "103.8813"},
        {"name": "1980", "value": "101.17103999999999"},
        {"name": "1982", "value": "98.06892"},
        {"name": "1984", "value": "93.619156"},
        {"name": "1986", "value": "94.81911"},
        {"name": "1988", "value": "94.774324"},
        {"name": "1990", "value": "90.70645"},
        {"name": "1992", "value": "83.626175"},
        {"name": "1994", "value": "76.156116"},
        {"name": "1996", "value": "71.23953"},
        {"name": "1998", "value": "66.21564"},
        {"name": "2000", "value": "60.836875"},
        {"name": "2002", "value": "59.40582"},
        {"name": "2004", "value": "59.64404"},
        {"name": "2006", "value": "54.030376999999994"},
        {"name": "2008", "value": "46.577754999999996"},
        {"name": "2010", "value": "42.038888"},
        {"name": "2012", "value": "40.625206000000006"},
        {"name": "2014", "value": "45.025682"},
        {"name": "2016", "value": "45.737422"},
        {"name": "2018", "value": "43.19193"},
        {"name": "2020", "value": "39.603937"},
      ]
    },
    {
      "name": "Europe and Central Asia",
      "series": [
        {"name": "1970", "value": "100"},
        {"name": "1972", "value": "103.28828000000001"},
        {"name": "1974", "value": "107.97343"},
        {"name": "1976", "value": "111.41124"},
        {"name": "1978", "value": "111.54101999999999"},
        {"name": "1980", "value": "111.79069"},
        {"name": "1982", "value": "113.51088"},
        {"name": "1984", "value": "114.12020000000001"},
        {"name": "1986", "value": "115.30493"},
        {"name": "1988", "value": "121.60263"},
        {"name": "1990", "value": "128.22378"},
        {"name": "1992", "value": "124.86655"},
        {"name": "1994", "value": "115.75325000000001"},
        {"name": "1996", "value": "107.80377000000001"},
        {"name": "1998", "value": "102.20506"},
        {"name": "2000", "value": "97.26542"},
        {"name": "2002", "value": "92.2821"},
        {"name": "2004", "value": "89.25807999999999"},
        {"name": "2006", "value": "87.97756"},
        {"name": "2008", "value": "86.272573"},
        {"name": "2010", "value": "85.353625"},
        {"name": "2012", "value": "76.98188"},
        {"name": "2014", "value": "70.045346"},
        {"name": "2016", "value": "66.20193"},
        {"name": "2018", "value": "62.69671"},
        {"name": "2020", "value": "64.715004"},
      ]
    },
    {
      "name": "Freshwater",
      "series": [
        {"name": "1970", "value": "100"},
        {"name": "1972", "value": "98.52717"},
        {"name": "1974", "value": "94.87048999999999"},
        {"name": "1976", "value": "86.56383"},
        {"name": "1978", "value": "78.73241300000001"},
        {"name": "1980", "value": "74.02299"},
        {"name": "1982", "value": "70.101494"},
        {"name": "1984", "value": "63.837219999999995"},
        {"name": "1986", "value": "59.06305"},
        {"name": "1988", "value": "53.848714"},
        {"name": "1990", "value": "49.232572000000005"},
        {"name": "1992", "value": "45.171323"},
        {"name": "1994", "value": "40.998059999999995"},
        {"name": "1996", "value": "36.620688"},
        {"name": "1998", "value": "31.9803"},
        {"name": "2000", "value": "28.348046999999998"},
        {"name": "2002", "value": "25.74576"},
        {"name": "2004", "value": "23.750272"},
        {"name": "2006", "value": "21.496353000000003"},
        {"name": "2008", "value": "19.42143"},
        {"name": "2010", "value": "17.565557000000002"},
        {"name": "2012", "value": "15.41621"},
        {"name": "2014", "value": "15.783352"},
        {"name": "2016", "value": "16.004752"},
        {"name": "2018", "value": "15.773053"},
        {"name": "2020", "value": "14.783052"},
      ]
    },
    {
      "name": "Latin America and the Caribbean",
      "series": [
        {"name": "1970", "value": "100"},
        {"name": "1972", "value": "99.45676"},
        {"name": "1974", "value": "89.129627"},
        {"name": "1976", "value": "77.16729"},
        {"name": "1978", "value": "68.224823"},
        {"name": "1980", "value": "63.43763"},
        {"name": "1982", "value": "56.798995"},
        {"name": "1984", "value": "48.506236"},
        {"name": "1986", "value": "43.925965"},
        {"name": "1988", "value": "38.98485"},
        {"name": "1990", "value": "35.569572"},
        {"name": "1992", "value": "32.499528"},
        {"name": "1994", "value": "28.054797999999998"},
        {"name": "1996", "value": "24.747573"},
        {"name": "1998", "value": "21.812765"},
        {"name": "2000", "value": "19.016159"},
        {"name": "2002", "value": "17.764032"},
        {"name": "2004", "value": "15.834408"},
        {"name": "2006", "value": "15.119104"},
        {"name": "2008", "value": "13.092011000000001"},
        {"name": "2010", "value": "9.4993964"},
        {"name": "2012", "value": "7.323765"},
        {"name": "2014", "value": "6.663473000000001"},
        {"name": "2016", "value": "5.97616"},
        {"name": "2018", "value": "5.621798699999999"},
        {"name": "2020", "value": "5.377315"},
      ]
    },
    {
      "name": "North America",
      "series": [
        {"name": "1970", "value": "100"},
        {"name": "1972", "value": "97.91978"},
        {"name": "1974", "value": "91.89177"},
        {"name": "1976", "value": "89.314854"},
        {"name": "1978", "value": "90.695524"},
        {"name": "1980", "value": "91.358733"},
        {"name": "1982", "value": "91.13525"},
        {"name": "1984", "value": "90.03016000000001"},
        {"name": "1986", "value": "89.44456"},
        {"name": "1988", "value": "87.6093"},
        {"name": "1990", "value": "85.06336"},
        {"name": "1992", "value": "83.01433"},
        {"name": "1994", "value": "83.59228"},
        {"name": "1996", "value": "79.80807399999999"},
        {"name": "1998", "value": "75.9126"},
        {"name": "2000", "value": "72.710913"},
        {"name": "2002", "value": "71.810484"},
        {"name": "2004", "value": "73.93665"},
        {"name": "2006", "value": "73.64116299999999"},
        {"name": "2008", "value": "73.19164"},
        {"name": "2010", "value": "72.07213"},
        {"name": "2012", "value": "70.69316"},
        {"name": "2014", "value": "69.22380299999999"},
        {"name": "2016", "value": "69.36165"},
        {"name": "2018", "value": "66.51272"},
        {"name": "2020", "value": "60.95505"},
      ]
    },
    {
      "name": "World",
      "series": [
        {"name": "1970", "value": "100"},
        {"name": "1972", "value": "98.14285000000001"},
        {"name": "1974", "value": "94.809854"},
        {"name": "1976", "value": "89.991647"},
        {"name": "1978", "value": "82.86782000000001"},
        {"name": "1980", "value": "78.43339"},
        {"name": "1982", "value": "74.73171400000001"},
        {"name": "1984", "value": "69.707686"},
        {"name": "1986", "value": "66.16929999999999"},
        {"name": "1988", "value": "62.675349999999995"},
        {"name": "1990", "value": "60.09213"},
        {"name": "1992", "value": "57.28322"},
        {"name": "1994", "value": "53.247344"},
        {"name": "1996", "value": "50.24958"},
        {"name": "1998", "value": "47.500777"},
        {"name": "2000", "value": "44.373488"},
        {"name": "2002", "value": "42.013386000000004"},
        {"name": "2004", "value": "39.984033000000004"},
        {"name": "2006", "value": "37.449524000000004"},
        {"name": "2008", "value": "34.355253000000005"},
        {"name": "2010", "value": "31.09998"},
        {"name": "2012", "value": "28.667074"},
        {"name": "2014", "value": "28.503707"},
        {"name": "2016", "value": "27.78848"},
        {"name": "2018", "value": "27.097133"},
        {"name": "2020", "value": "27.134067"},
      ]
    }
  ] 

  //Endangered species by category
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

  constructor( ) { }

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

  openAboutModal(): void {
    this.showAboutModal = true;
  }

  closeAboutModal(): void {
    this.showAboutModal = false;
  }
}