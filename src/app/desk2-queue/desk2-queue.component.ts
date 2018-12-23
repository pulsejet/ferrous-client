import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../data.service';
import { ContingentArrival } from '../interfaces';
import { HubConnection, HubConnectionBuilder } from '@aspnet/signalr';
import { noop } from 'rxjs';

@Component({
  selector: 'app-desk2-queue',
  templateUrl: './desk2-queue.component.html',
  styleUrls: ['./desk2-queue.component.css']
})
export class Desk2QueueComponent implements OnInit, OnDestroy {

  public cas: ContingentArrival[];

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
  ) { }

  ngOnInit() {
    this.updateQueue(noop);
    this.startBuildingHubConnection();
  }

  updateQueue(callback: () => void) {
    this.dataService.FireLink(
      this.dataService.GetLink(this.dataService.GetAPISpec(), 'desk2queue')
    ).subscribe(result => {
      this.cas = result as ContingentArrival[];
      callback();
    });
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
    this.hubConnection.on('updated', () => {
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
      this.updateQueue(done);
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
}
