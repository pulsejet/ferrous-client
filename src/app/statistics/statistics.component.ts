import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../data.service';
import { Building, Link, EnumContainer } from '../interfaces';
import { Title } from '@angular/platform-browser';
import { sortNatural } from '../helpers';
import { HubConnection, HubConnectionBuilder } from '@aspnet/signalr';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit, OnDestroy {

  public buildings: Building[];
  public links: Link[];

  public totalPie: any;
  public roomsPie: any;
  public availableCapacityPie: any;
  public capacityChart: any;
  public roomsChart: any;

  /** WebSocket connection for updates */
  private hubConnection: HubConnection;
  /** Set to false when deliberately disconnecting */
  private connectWebsocket = true;
  /** Status of hubConnection
   * 0 = not connected
   * 1 = connected
   * 2 = just received
   */
  public hubStatus = 0;
  /** Number for update check */
  public hubCheck = 0;

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

      this.makeAllCharts();

      /** Start websocket */
      this.connectWebsocket = true;
      this.startBuildingHubConnection();
    });
  }

  /** Construct all charts */
  makeAllCharts() {
    this.makeTotalPie();
    this.makeRoomsPie();
    this.makeAvailableCapacityPie();
    this.makeCapacityChart();
    this.makeRoomsChart();
  }

  ngOnDestroy() {
    /* Kill the hub connection */
    this.connectWebsocket = false;
    if (this.hubConnection) {
        this.hubConnection.stop();
    }
  }

  /** Connnect to the websocket */
  startBuildingHubConnection(): void {
    if (!this.dataService.CheckIfLink(this.dataService.GetAPISpec(), 'stats-update') ||
        !this.connectWebsocket) {
        return;
    }

    /* Connect to the websocket */
    this.hubConnection = new HubConnectionBuilder()
            .withUrl(this.dataService.GetLink(this.dataService.GetAPISpec(), 'building_websocket').href)
            .build();

    /* Reload room on updated event */
    this.hubConnection.on('updated', rids => {
      /* Update status */
      this.hubStatus = 2;
      const hubC = ++this.hubCheck;

      /* Mark status done */
      const done = () => {
        if (hubC === this.hubCheck && this.hubStatus === 2) {
          this.hubStatus = 1;
        }
      };

      /* Update data */
      this.dataService.FireLink<EnumContainer>(
        this.dataService.GetLink(this.dataService.GetAPISpec(), 'stats-update'), rids
      ).subscribe(container => {
        for (const building of container.data) {
          const current: number = this.buildings.findIndex(b => b.location === building.location);
          this.buildings[current] = building;
        }
        this.makeAllCharts();
        done();
      }, () => done());
    });

    /* Join the group for the building */
    this.hubConnection.start()
        .then(() => {
            this.hubConnection.invoke(
                this.dataService.GetLink(
                    this.dataService.GetAPISpec(), 'building_websocket_join').href,
                'ALL'
            );
            console.log('Hub connection started');
            this.hubStatus = 1;
        })
        .catch(() => {
            console.log('Error while establishing connection');
            setTimeout(() => {
                this.startBuildingHubConnection();
            }, 500);
            this.hubStatus = 0;
        });

    /* Reconnect if necessary */
    this.hubConnection.onclose(() => {
        setTimeout(() => {
            this.startBuildingHubConnection();
        }, 500);
        this.hubStatus = 0;
    });
  }

  makeTotalPie() {
    this.totalPie = {
      chartType: 'PieChart',
      dataTable: [
        ['Metric', 'Number of People'],
        ['Available', this.getTotalAvailable()],
        ['Filled', this.getTotalFilled()],
        ['Not Ready',  this.getTotalNR()],
        ['Maintainance',  this.getTotalMaint()]
      ],
      options: {
        height: 250,
        colors: ['darkblue', 'orange', 'lightpink', 'magenta']
      },
    };
  }

  makeCapacityChart() {
    const dataTable = [];
    dataTable.push(['Building', 'Available', 'Filled', 'Not Ready', 'Maintainance']);
    for (const building of this.buildings) {
      dataTable.push([
        building.locationFullName,
        building.capacityEmpty,
        building.capacityFilled,
        building.capacityNotReady,
        building.capacityMaintainance
      ]);
    }
    this.capacityChart = this.getBigBarChart(dataTable, ['darkblue', 'orange', 'lightpink', 'magenta']);
  }

  makeRoomsChart() {
    const dataTable = [];
    dataTable.push(['Building', 'Available', 'Partial', 'Full', 'Not Ready', 'Maintainance']);
    for (const building of this.buildings) {
      dataTable.push([
        building.locationFullName,
        building.roomsEmpty,
        building.roomsPartial,
        building.roomsFilled,
        building.roomsNotReady,
        building.roomsMaintainance
      ]);
    }
    this.roomsChart = this.getBigBarChart(dataTable, ['darkblue', 'blue', 'orange', 'lightpink', 'magenta']);
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
        ['Not Ready',  this.getRoomsNR()],
        ['Maintainance',  this.getRoomsMaint()]
      ],
      options: {
        height: 250,
        colors: ['darkblue', 'blue', 'orange', 'lightpink', 'magenta']
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

  getRoomsMaint() {
    return this.sum(this.buildings.map(b => b.roomsMaintainance));
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

  getTotalMaint() {
    return this.sum(this.buildings.map(b => b.capacityMaintainance));
  }

  sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0);
  }
}
