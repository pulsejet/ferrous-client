import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../data.service';
import { Building, Link, EnumContainer } from '../interfaces';
import { Title } from '@angular/platform-browser';
import { sortNatural } from '../helpers';
import { HubConnection, HubConnectionBuilder } from '@aspnet/signalr';
import { noop } from 'rxjs';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit, OnDestroy {

  public buildings: Building[];
  public links: Link[];
  public caStats: any;

  public totalPie = { M: null, F: null };
  public roomsPie = { M: null, F: null };
  public availableCapacityPie = { M: null, F: null };
  public capacityChart = { M: null, F: null };
  public roomsChart = { M: null, F: null };

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

    this.updateCAStats(noop);
  }

  /** Construct all charts */
  makeAllCharts() {
    for (const s of ['M', 'F']) {
      this.makeTotalPie(s);
      this.makeRoomsPie(s);
      this.makeAvailableCapacityPie(s);
      this.makeCapacityChart(s);
      this.makeRoomsChart(s);
    }
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
      this.updateBuildings(rids, () => {
        this.updateCAStats(() => done());
      });
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

  /**
   * Update buildings from websocket room ids
   * @param roomIds Room Ids known to have been updated
   * @param callback Callback with status as argument
   */
  updateBuildings(roomIds: number[], callback: (b: boolean) => void) {
    this.dataService.FireLink<EnumContainer>(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'stats-update'), roomIds
    ).subscribe(container => {
      for (const building of container.data) {
        const current: number = this.buildings.findIndex(b => b.location === building.location);
        this.buildings[current] = building;
      }
      this.makeAllCharts();
      callback(true);
    }, () => callback(false));
  }

  /** Update general ca stats with callback */
  updateCAStats(callback: (b: boolean) => void) {
    this.dataService.FireLink(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'ca-stats')
    ).subscribe(result => {
      this.caStats = result;
      callback(true);
    }, () => callback(false));
  }

  makeTotalPie(s: string) {
    this.totalPie[s] = {
      chartType: 'PieChart',
      dataTable: [
        ['Metric', 'Number of People'],
        ['Available', this.getTotalAvailable(s)],
        ['Filled', this.getTotalFilled(s)],
        ['Not Ready',  this.getTotalNR(s)],
        ['Maintainance',  this.getTotalMaint(s)]
      ],
      options: {
        height: 250,
        colors: ['darkblue', 'orange', 'lightpink', 'magenta']
      },
    };
  }

  makeCapacityChart(s: string) {
    const dataTable = [];
    dataTable.push(['Building', 'Available', 'Filled', 'Not Ready', 'Maintainance']);
    for (const building of this.buildings.filter(b => b.sex === s)) {
      dataTable.push([
        building.locationFullName,
        building.capacityEmpty,
        building.capacityFilled,
        building.capacityNotReady,
        building.capacityMaintainance
      ]);
    }
    this.capacityChart[s] = this.getBigBarChart(dataTable, ['darkblue', 'orange', 'lightpink', 'magenta']);
  }

  makeRoomsChart(s: string) {
    const dataTable = [];
    dataTable.push(['Building', 'Available', 'Partial', 'Full', 'Not Ready', 'Maintainance']);
    for (const building of this.buildings.filter(b => b.sex === s)) {
      dataTable.push([
        building.locationFullName,
        building.roomsEmpty,
        building.roomsPartial,
        building.roomsFilled,
        building.roomsNotReady,
        building.roomsMaintainance
      ]);
    }
    this.roomsChart[s] = this.getBigBarChart(dataTable, ['darkblue', 'blue', 'orange', 'lightpink', 'magenta']);
  }

  getBigBarChart(dataTable: any, colors: any) {
    return {
      chartType: 'BarChart',
      dataTable: dataTable,
      options: {
        legend: { position: 'top' },
        isStacked: true,
        bar: {groupWidth: 15},
        height: 400,
        width: 460,
        chartArea: { height: 400 },
        colors: colors
      },
    };
  }

  makeAvailableCapacityPie(s: string) {
    const dataTable = [];
    dataTable.push(['Building', 'Capacity']);
    for (const building of this.buildings.filter(b => b.sex === s)) {
      dataTable.push([
        building.locationFullName,
        building.capacityEmpty
      ]);
    }

    this.availableCapacityPie[s] = {
      chartType: 'PieChart',
      dataTable: dataTable,
      options: {
        width: 400,
        height: 320,
        chartArea: {width: 400, height: 300}
      },
    };
  }

  makeRoomsPie(s: string) {
    this.roomsPie[s] = {
      chartType: 'PieChart',
      dataTable: [
        ['Metric', 'Rooms'],
        ['Empty', this.getRoomsEmpty(s)],
        ['Partial', this.getRoomsPartial(s)],
        ['Filled', this.getRoomsFilled(s)],
        ['Not Ready',  this.getRoomsNR(s)],
        ['Maintainance',  this.getRoomsMaint(s)]
      ],
      options: {
        height: 250,
        colors: ['darkblue', 'blue', 'orange', 'lightpink', 'magenta']
      },
    };
  }

  getRoomsTotal(s: string): number {
    return this.getSum(s, b => b.roomsTotal);
  }

  getRoomsEmpty(s: string): number {
    return this.getSum(s, b => b.roomsEmpty);
  }

  getRoomsPartial(s: string): number {
    return this.getSum(s, b => b.roomsPartial);
  }

  getRoomsFilled(s: string): number {
    return this.getSum(s, b => b.roomsFilled);
  }

  getRoomsNR(s: string): number {
    return this.getSum(s, b => b.roomsNotReady);
  }

  getRoomsMaint(s: string): number {
    return this.getSum(s, b => b.roomsMaintainance);
  }

  getTotalAvailable(s: string): number {
    return this.getSum(s, b => b.capacityEmpty);
  }

  getTotalFilled(s: string): number {
    return this.getSum(s, b => b.capacityFilled);
  }

  getTotalNR(s: string): number {
    return this.getSum(s, b => b.capacityNotReady);
  }

  getTotalMaint(s: string): number {
    return this.getSum(s, b => b.capacityMaintainance);
  }

  getSum(sex: string, field: (b: Building) => number): number {
    return this.sum(this.buildings.filter(b => b.sex === sex).map(field));
  }

  sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
  }

  getIcon(s: string) {
    return {
      M: '♂',
      F: '♀'
    }[s];
  }

  getCAStat(s: string, f: string): number {
    return Number(this.caStats[s.toLowerCase()][f]);
  }
}
