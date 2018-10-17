import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { Building, Link } from '../interfaces';
import { Title } from '@angular/platform-browser';
import { sortNatural } from '../helpers';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {

  public buildings: Building[];
  public links: Link[];

  public totalPie: any;
  public roomsPie: any;
  public availableCapacityPie: any;
  public capacityChart: any;
  public roomsChart: any;

  constructor(
    public dataService: DataService,
    public titleService: Title,
  ) {
    this.titleService.setTitle('Statistics');
  }

  ngOnInit() {
    this.dataService.GetAllBuildingsExtended(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'mark_buildings')
    ).subscribe(result => {
      this.buildings = result.data;
      this.links = result.links;

      sortNatural(this.buildings, 'locationFullName');

      /* Construct charts */
      this.makeTotalPie();
      this.makeRoomsPie();
      this.makeAvailableCapacityPie();
      this.makeCapacityChart();
      this.makeRoomsChart();
    });
  }

  getTotalAvailable() {
    return this.sum(this.buildings.map(b => b.capacityEmpty));
  }

  getTotalFilled() {
    return this.sum(this.buildings.map(b => b.capacityFilled));
  }

  getTotalNR() {
    return this.sum(this.buildings.map(b => b.capacityNotReady));
  }

  makeTotalPie() {
    this.totalPie = {
      chartType: 'PieChart',
      dataTable: [
        ['Metric', 'Number of People'],
        ['Available', this.getTotalAvailable()],
        ['Filled', this.getTotalFilled()],
        ['Not Ready',  this.getTotalNR()]
      ],
      options: {
        height: 250,
        colors: ['darkblue', 'orange', 'lightpink']
      },
    };
  }

  makeCapacityChart() {
    const dataTable = [];
    dataTable.push(['Building', 'Available', 'Filled', 'Not Ready']);
    for (const building of this.buildings) {
      dataTable.push([
        building.locationFullName,
        building.capacityEmpty,
        building.capacityFilled,
        building.capacityNotReady
      ]);
    }
    this.capacityChart = this.getBigBarChart(dataTable, ['darkblue', 'orange', 'lightpink']);
  }

  makeRoomsChart() {
    const dataTable = [];
    dataTable.push(['Building', 'Available', 'Partial', 'Full', 'Not Ready']);
    for (const building of this.buildings) {
      dataTable.push([
        building.locationFullName,
        building.roomsEmpty,
        building.roomsPartial,
        building.roomsFilled,
        building.roomsNotReady
      ]);
    }
    this.roomsChart = this.getBigBarChart(dataTable, ['darkblue', 'blue', 'orange', 'lightpink']);
  }

  getBigBarChart(dataTable: any, colors: any) {
    return {
      chartType: 'BarChart',
      dataTable: dataTable,
      options: {
        legend: { position: 'top' },
        isStacked: true,
        height: 600,
        width: 460,
        chartArea: { height: 520 },
        colors: colors
      },
    };
  }

  makeAvailableCapacityPie() {
    const dataTable = [];
    dataTable.push(['Building', 'Capacity']);
    for (const building of this.buildings) {
      dataTable.push([
        building.locationFullName,
        building.capacityEmpty
      ]);
    }

    this.availableCapacityPie = {
      chartType: 'PieChart',
      dataTable: dataTable,
      options: {
        width: 400,
        height: 320,
        chartArea: {width: 400, height: 300}
      },
    };
  }

  makeRoomsPie() {
    this.roomsPie = {
      chartType: 'PieChart',
      dataTable: [
        ['Metric', 'Rooms'],
        ['Empty', this.getRoomsEmpty()],
        ['Partial', this.getRoomsPartial()],
        ['Filled', this.getRoomsFilled()],
        ['Not Ready',  this.getRoomsNR()]
      ],
      options: {
        height: 250,
        colors: ['darkblue', 'blue', 'orange', 'lightpink']
      },
    };
  }

  getRoomsTotal() {
    return this.sum(this.buildings.map(b => b.roomsTotal));
  }

  getRoomsEmpty() {
    return this.sum(this.buildings.map(b => b.roomsEmpty));
  }

  getRoomsPartial() {
    return this.sum(this.buildings.map(b => b.roomsPartial));
  }

  getRoomsFilled() {
    return this.sum(this.buildings.map(b => b.roomsFilled));
  }

  getRoomsNR() {
    return this.sum(this.buildings.map(b => b.roomsNotReady));
  }

  sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0);
  }
}
