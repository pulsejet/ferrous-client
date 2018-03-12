import { Component, Inject, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Room, RoomAllocation, Link, Building } from '../interfaces';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { RoomDialogComponent } from '../room-dialog/room-dialog.component';
import { Subscription } from 'rxjs/Subscription';
import { HubConnection } from '@aspnet/signalr';
import * as $ from 'jquery';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { SlideInOutAnimation } from '../animations';

/* Room layout component */
@Component({
    selector: 'app-room-layout',
    templateUrl: './room-layout.component.html',
    animations: [SlideInOutAnimation],
})
export class RoomLayoutComponent implements OnInit, OnDestroy {
    /** Master list of rooms */
    public rooms: Room[];
    /** Always true after initialization */
    public roomsInited = false;
    /** Current CLNo */
    public clno: string;
    /** Full name of current location (e.g. Hostel 7) */
    public locFullname: string;
    /** Code of current location (e.g. H7) */
    public locCode: string;
    /** Layout element */
    @ViewChild('roomsLayout') roomsLayout: ElementRef;
    /** true if marking */
    public marking = false;
    /** true if room updated snackbar is showing */
    public roomUpdateSnackbarShowing = false;
    /** WebSocket connection for layout */
    private hubConnection: HubConnection;
    /** Set to false when deliberately disconnecting */
    private connectWebsocket = true;

    public urlLink: Link;
    public links: Link[];

    /** constructor for RoomLayoutComponent */
    constructor(
        private activatedRoute: ActivatedRoute,
        private titleService: Title,
        private dataService: DataService,
        public snackBar: MatSnackBar,
        public dialog: MatDialog,
        @Inject('BASE_URL') public baseUrl: string) {

        this.titleService.setTitle('Room Layout');

        /* Get URL parameters */
        this.activatedRoute.params.subscribe((params: Params) => {
            this.urlLink = dataService.DecodeObject(params['link']);
            this.locCode = params['location'];
            this.clno = params['clno'];
        });

        /* Get room layout by location */
        dataService.GetRoomLayout(this.locCode).subscribe(result => {
            this.roomsLayout.nativeElement.innerHTML = result;

            /* Load rooms */
            this.reloadRooms();
        });
    }

    ngOnInit() {
        this.connectWebsocket = true;
        this.startBuildingHubConnection();
    }

    /** Connnect to the websocket */
    startBuildingHubConnection(): void {
        if (!this.connectWebsocket) {
            return;
        }

        /* Connect to the websocket */
        this.hubConnection = new HubConnection(
            this.dataService.GetLink(this.dataService.GetAPISpec(), 'building_websocket').href
        );

        /* Reload room on updated event */
        this.hubConnection.on('updated', rid => {
            if (this.noHubConnection) { return; }
            const index = this.rooms.findIndex(room => room.roomId === rid);
            this.dataService.FireLinkSelf(this.rooms[index].links).subscribe(result => {
                this.rooms[index] = result as Room;
                this.assignRoom(this.rooms[index]);

                if (!this.roomUpdateSnackbarShowing) {
                    this.snackBar.open('Room data updated', 'Dismiss', {
                        duration: 2000,
                    });
                    this.roomUpdateSnackbarShowing = true;
                    setTimeout(() => this.roomUpdateSnackbarShowing = false, 2000);
                }
            });
        });

        /* Join the group for the building */
        this.hubConnection.start()
            .then(() => {
                if (this.noHubConnection) { return; }
                this.hubConnection.invoke(
                    this.dataService.GetLink(
                        this.dataService.GetAPISpec(), 'building_websocket_join').href,
                    this.locCode
                );
                console.log('Hub connection started');
            })
            .catch(() => {
                console.log('Error while establishing connection');
                setTimeout(() => {
                    this.startBuildingHubConnection();
                }, 500);
            });

        /* Reconnect if necessary */
        this.hubConnection.onclose(() => {
            setTimeout(() => {
                this.startBuildingHubConnection();
            }, 500);
        });
    }

    /** Cancel every websocket action if this is true */
    noHubConnection() {
        if (!this.connectWebsocket && this.hubConnection) {
            this.hubConnection.stop();
        }
        return !this.connectWebsocket;
    }

    ngOnDestroy() {
        /* Kill the hub connection */
        this.connectWebsocket = false;
        if (this.hubConnection) {
            this.hubConnection.stop();
        }
    }

    /**
     * Reload all room data and restart websocket
     */
    reloadRooms(restartWebsock: boolean = false) {
        if (restartWebsock && this.connectWebsocket && this.hubConnection) {
            this.hubConnection.stop();
        }

        this.dataService.FireLink<Building>(this.urlLink).subscribe(result => {
            this.links = result.links;
            this.rooms = result.room;

            /* Assign other things */
            this.locFullname = result.locationFullName;
            this.assignRoomsInit();
            this.assignRooms();

            /* Alert the user */
            this.snackBar.open('Room data updated', 'Dismiss', {
                duration: 2000,
            });

        });
    }

    /** Initialize Rooms */
    public assignRoomsInit() {
        /* Prevent initialization twice */
        if (this.roomsInited) { return; }

        const self = this;
        this.rooms.forEach(room => {
            /* Find the room by HTML id */
            const ctrl = this.getRoomId(room);
            const index = self.rooms.indexOf(room);

            /* Mark the room selected */
            $(ctrl).click(() => {
                this.handleRoomClick(index);
            });

            /* Handle right click */
            $(ctrl).contextmenu(() => {
                this.handleContextMenuRoom(index);
                return false;
            });

        });

        /* Mark initialization done */
        this.roomsInited = true;
    }

    /**
     * Handle right click of room
     * @param index Index of Room in master
     */
    public handleContextMenuRoom(index: number) {
        this.dialog.open(RoomDialogComponent, {
            data: this.rooms[index]
        });
    }

    /**
     * Handle room click
     * @param index Index of Room in master
     */
    public handleRoomClick(index: number) {
        const room: Room = this.rooms[index];
        if ((room.status === 1 && room.roomAllocation.length === 0)
            || (this.checkPartial(room) && this.getCapacity(room) > 0)
            || room.selected
            || this.marking) {

            room.selected = !room.selected;
        }

        /* Update room graphic */
        this.assignRoom(room);
    }

    /** Update graphics for all rooms */
    public assignRooms() {
        this.rooms.forEach(room => this.assignRoom(room));
    }

    /**
     * Update graphic for one room
     * @param room Room to be updated
     */
    public assignRoom(room: Room) {
        const ctrl = this.getRoomId(room);
        const clss: string = this.getRoomClass(room);

        /* Show capacity and room number */
        $(ctrl).html(this.getCapacity(room) + '<br><span>' + room.roomName.toString() + '</span>');

        /* Assign CSS class */
        $(ctrl).attr('class', clss);
    }

    /**
     * Try to mark all selected rooms with status
     * @param status Status to mark
     */
    public mark(status: number) {
        this.rooms.filter(r => r.selected === true).forEach(room => {
            this.dataService.MarkRoom(room, status).subscribe(() => {
            }, () => {
                /* Show error */
                this.snackBar.open('Mark failed for ' + room.roomName, 'Dismiss', {
                    duration: 2000,
                });
            });
        });
    }

    /**
     * Get number of free spaces in room
     * @param room Room object
     */
    public getCapacity(room: Room): number {
        if (this.checkOccupied(room)) {
            return 0;
        } else if (this.checkPartial(room)) {
            return (room.capacity - this.getPartialNo(room));
        } else {
            return room.capacity;
        }
    }

    /** Allot all selected rooms to current Contingent */
    public allot() {

        /* Validate */
        for (const room of this.rooms.filter(r => r.selected === true)) {
            /* Status */
            if (room.status !== 1) {
                /* Show error */
                this.snackBar.open('Non-allocable room ' + room.roomName, 'Dismiss', {
                    duration: 2000,
                });
                console.log('Non-allocable room ' + room.roomName);
                return;
            }

            /* Partial */
            if ((room.partialallot || this.checkPartial(room)) &&
                (!this.dataService.CheckValidNumber(room.partialsel, 1))) {

                /* Show error */
                this.snackBar.open('Invalid partial capacity for ' + room.roomName, 'Dismiss', {
                    duration: 2000,
                });
                console.log('Invalid partial capacity for ' + room.roomName);
                return;
            }
        }

        this.rooms.filter(r => r.selected === true).forEach(room => {
            this.dataService.AllotRoom(room).subscribe(result => {
            }, (): void => {
                /* Show error */
                this.snackBar.open('Allotment failed for ' + room.roomName, 'Dismiss', {
                    duration: 2000,
                });
            });
        });
    }

    /** Check if room is full */
    public checkOccupied(room: Room): boolean {
        return this.dataService.RoomCheckOccupied(room);
    }

    /** Check if partially filled */
    public checkPartial(room: Room): boolean {
        return this.dataService.RoomCheckPartial(room);
    }

    /** Get partial number of people in room */
    public getPartialNo(room: Room): number {
        return this.dataService.RoomGetPartialNo(room);
    }

    /**
     * Get CSS class for room
     * @param room Room object
     */
    public getRoomClass(room: Room): string {
        /* Selected has top priority */
        if (room.selected) { return 'room sel'; }

        let containsThis = false;      /* Room contains current contingent     */
        let containsOther = false;     /* Room contains another contingent     */
        let filled = 0;                 /* Number of people currently in room   */

        /* Fill up local data */
        room.roomAllocation.forEach(roomA => {
            if (roomA.contingentLeaderNo === this.clno) {
                containsThis = true;
            } else {
                containsOther = true;
            }

            if (roomA.partial != null && roomA.partial <= 0) {
                filled += Number(room.capacity);
            } else {
                filled += Number(roomA.partial);
            }
        });

        /* Assign classes */
        if (filled < room.capacity) {
            if (containsOther && !containsThis) {
                return 'room partial';
            } else if (containsThis) {
                return 'room already-partial';
            }
        } else {
            if (containsOther && !containsThis) {
                return 'room occupied';
            } else if (!containsOther && containsThis) {
                return 'room already';
            } else if (containsOther && containsThis) {
                return 'room already-fullshared';
            }
        }

        /* Fall back to status code */
        const status = room.status;
        if (status === 0) {
            return 'room unavailable';
        } else if (status === 1) {
            return 'room empty';
        } else if (status === 2) {
            return 'room occupied';
        } else if (status === 3) {
            return 'room partial';
        } else if (status === 4) {
            return 'room notready';
        }
        return 'room';
    }

    /**
     * DELETE a RoomAllocation
     * @param roomA RoomAllocation object
     * @param room Room object for local removal of allocation
     */
    public unallocateRoom(roomA: RoomAllocation, room: Room) {
        this.dataService.UnallocateRoom(roomA).subscribe(() => {
            const index = room.roomAllocation.indexOf(roomA, 0);
            room.roomAllocation.splice(index, 1);
            this.assignRoom(room);
        });
    }

    /**
     * Check if room can be allocated
     * @param room Room object
     */
    public canAllocate(room: Room): boolean {
        return ((room.status === 1) || (room.status === 3)) && (!this.checkOccupied(room));
    }

    /**
     * Gets the CSS ID selector from a Room
     * @param room Room object
     */
    public getRoomId(room: Room): string {
        return ('#room-' + room.location + '-' + room.roomName).replace(/\s+/, '');
    }

    /** True if a room which cannot be marked is selected */
    public hasUnmarkableRoomSelected(): boolean {
        return this.rooms.filter(r => r.selected === true).some(room =>
            !this.dataService.CheckIfLink(room.links, 'mark')
        );
    }

    /** True if a room which cannot be alloted is selected */
    public hasUnallotableRoomSelected(): boolean {
        return this.rooms.filter(r => r.selected === true).some(room =>
            !this.dataService.CheckIfLink(room.links, 'allot') ||
            !this.canAllocate(room) ||
            ((room.partialallot || this.checkPartial(room)) &&
                (!this.dataService.CheckValidNumber(room.partialsel, 1)))
        );
    }

    /** true if at least one room is selected */
    public hasRoomsSelected(): boolean {
        return this.rooms.filter(r => r.selected === true).length > 0;
    }

    /** Fires the bill link in a new tab */
    public openBill() {
        window.open(this.dataService.GetLink(this.links, 'bill').href, '_blank');
    }
}
