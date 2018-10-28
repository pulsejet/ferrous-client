import { Component, Inject, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Room, RoomAllocation, Link, Building, ContingentArrival } from '../interfaces';
import { Title } from '@angular/platform-browser';
import { DataService } from '../data.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { RoomDialogComponent } from '../room-dialog/room-dialog.component';
import { HubConnection, HubConnectionBuilder } from '@aspnet/signalr';
import * as $ from 'jquery';
import { SlideInOutAnimation } from '../animations';
import { Observable } from 'rxjs';

/* Room layout component */
@Component({
    selector: 'app-room-layout',
    templateUrl: './room-layout.component.html',
    animations: [SlideInOutAnimation],
})
export class RoomLayoutComponent implements OnInit, OnDestroy {
    /** Whole building */
    public building: Building;
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

    /** Curent contingent arrival */
    public contingentArrival: ContingentArrival;

    public urlLink: Link;
    public links: Link[];

    private currCAReq: number;

    /** constructor for RoomLayoutComponent */
    constructor(
        private activatedRoute: ActivatedRoute,
        private titleService: Title,
        public dataService: DataService,
        public snackBar: MatSnackBar,
        public dialog: MatDialog,
        @Inject('BASE_URL') public baseUrl: string) {

        this.titleService.setTitle('Room Layout');

        /* Get URL parameters */
        this.activatedRoute.params.subscribe((params: Params) => {
            this.urlLink = dataService.DecodeObject(params['link']);
            this.locCode = params['location'];
            this.clno = params['clno'];

            this.marking = (this.clno === 'marking');

            /* Get room layout by location */
            dataService.GetRoomLayout(this.locCode).subscribe(result => {
                this.roomsLayout.nativeElement.innerHTML = result;

                /* Load rooms */
                this.reloadRooms();
            });
        });
    }

    ngOnInit() {
        this.connectWebsocket = true;
        this.startBuildingHubConnection();
    }

    /** Load contingent arrival */
    loadCA(): Observable<ContingentArrival> {
        return Observable.create(observer => {
            /* Skip for marking */
            if (this.marking || !this.dataService.CheckIfLink(this.links, 'get-ca')) {
                observer.next(null);
                observer.complete();
            }

            /* Check for duplicate requests */
            const rand = Math.floor(Math.random() * 100) + 1;
            this.currCAReq = rand;

            /* Load the contingent arrival */
            this.dataService.FireLink<ContingentArrival>(
                this.dataService.GetLink(this.links, 'get-ca')
            ).subscribe(res => {
                // Check if a new request was made
                if (this.currCAReq !== rand) {
                    observer.error(null);
                    return;
                }

                // Initialize
                if (res.male === null) { res.male = 0; }
                if (res.female === null) { res.female = 0; }
                res.male += res.maleOnSpot;
                res.female += res.femaleOnSpot;
                this.contingentArrival = res;

                // Complete the observable
                observer.next(res);
                observer.complete();
            }, error => observer.error(error));
        });
    }

    /** Get count of male allocated + selected */
    getMaleSel() {
        if (this.building.sex.toUpperCase() !== 'M') { return this.contingentArrival.allottedMale; }
        const rooms = this.rooms.filter(r => r.selected && this.canAllocate(r));
        return this.contingentArrival.allottedMale + this.sum(rooms.map(r => this.getCapacitySel(r)));
    }

    /** Get count of female allocated + selected */
    getFemaleSel() {
        if (this.building.sex.toUpperCase() !== 'F') { return this.contingentArrival.allottedFemale; }
        const rooms = this.rooms.filter(r => r.selected && this.canAllocate(r));
        return this.contingentArrival.allottedFemale + this.sum(rooms.map(r => this.getCapacitySel(r)));
    }

    getCapacitySel(room: Room): number {
        if (this.checkPartial(room) || room.partialallot) {
            if (room.partialsel == null) { return 0; }
            return Number(room.partialsel);
        }
        return Number(this.getCapacity(room));
    }

    /** Connnect to the websocket */
    startBuildingHubConnection(): void {
        if (!this.connectWebsocket) {
            return;
        }

        /* Connect to the websocket */
        this.hubConnection = new HubConnectionBuilder()
                .withUrl(this.dataService.GetLink(this.dataService.GetAPISpec(), 'building_websocket').href)
                .build();

        /* Reload room on updated event */
        this.hubConnection.on('updated', rids => {
            this.hubConnectionUpdate(rids);
        });

        /* Join the group for the building */
        this.hubConnection.start()
            .then(() => {
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

    hubConnectionUpdate(rids: any) {
        /* Fire the link to download multiple rooms */
        this.dataService.FireLink(
            this.dataService.GetLink(this.links, 'list_rooms'), rids
        ).subscribe(result => {

            /* Update all returned rooms */
            const rooms = result as Room[];
            rooms.forEach(room => {
                const index = this.rooms.findIndex(r => r.roomId === room.roomId);
                this.rooms[index] = room;
                this.assignRoom(this.rooms[index]);
            });

            /* Notify the user */
            if (!this.roomUpdateSnackbarShowing) {
                this.snackBar.open('Room data updated', 'Dismiss', {
                    duration: 2000,
                });
                this.roomUpdateSnackbarShowing = true;
                setTimeout(() => this.roomUpdateSnackbarShowing = false, 2000);
            }

        });
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
            this.building = result;
            this.links = result.links;

            /* Fill CA */
            this.loadCA().subscribe(() => {
                /* Assign other things */
                this.rooms = result.room;
                this.locFullname = result.locationFullName;
                this.assignRoomsInit();
                this.assignRooms();

                /* Alert the user */
                this.snackBar.open('Room data updated', 'Dismiss', {
                    duration: 2000,
                });
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
            $(ctrl).on('click', () => {
                this.handleRoomClick(index);
            });

            /* Handle right click */
            $(ctrl).on('contextmenu', () => {
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
        this.dataService.FireLink(
            this.dataService.GetLink(this.links, 'mark'),
            this.rooms.filter(r => r.selected === true).map(r => r.roomId),
            {status: status}
        ).subscribe();
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
        if (this.hasUnallotableRoomSelected()) { return; }

        /* Fire off! */
        this.dataService.FireLink(
            this.dataService.GetLink(this.links, 'allot'),
            this.rooms.filter(r => r.selected === true).map(room => {
                return {
                    roomId: room.roomId,
                    partial: ((room.partialsel > 0) ? room.partialsel : undefined)
                };
            })).subscribe(() => this.loadCA().subscribe());
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
        /* Helper to get string */
        const getFullClass = (c: string, border: boolean = false) => {
            return `room ${c}${border ? ' border' : ''}`;
        };

        let containsThis = false;      /* Room contains current contingent     */
        let containsOther = false;     /* Room contains another contingent     */
        let filled = 0;                 /* Number of people currently in room   */
        let currentCA = false;          /* True if the room is given to current CA */

        /* Fill up local data */
        room.roomAllocation.forEach(roomA => {
            if (roomA.contingentLeaderNo === this.clno) {
                containsThis = true;
                if (!this.marking &&
                    roomA.contingentArrivalNo === this.contingentArrival.contingentArrivalNo) {
                    currentCA = true;
                }
            } else {
                containsOther = true;
            }

            if (roomA.partial != null && roomA.partial <= 0) {
                filled += Number(room.capacity);
            } else {
                filled += Number(roomA.partial);
            }
        });

        /* Selected has top priority */
        if (room.selected) { return getFullClass('sel', currentCA); }

        /* Assign classes */
        if (filled < room.capacity) {
            if (containsOther && !containsThis) {
                return getFullClass('partial', currentCA);
            } else if (containsThis) {
                return getFullClass('already-partial', currentCA);
            }
        } else {
            if (containsOther && !containsThis) {
                return getFullClass('occupied', currentCA);
            } else if (!containsOther && containsThis) {
                return getFullClass('already', currentCA);
            } else if (containsOther && containsThis) {
                return getFullClass('already-fullshared', currentCA);
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
    public unallocateRoom(roomA: RoomAllocation) {
        this.dataService.UnallocateRoom(roomA).subscribe(() => this.loadCA().subscribe());
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
        return !this.dataService.CheckIfLink(this.links, 'mark');
    }

    /** True if a room which cannot be alloted is selected */
    public hasUnallotableRoomSelected(): boolean {
        return !this.dataService.CheckIfLink(this.links, 'allot') ||
        this.rooms.filter(r => r.selected === true).some(room =>
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

    /** True if we have a layout skip link */
    hasDirectSexLink(sex: string) {
        return (this.dataService.hostelKeys[sex] !== '' &&
            this.contingentArrival);
    }

    /** Skip select layout */
    gotoDirectSexLink(sex: string) {
        /* Un-initialize */
        this.roomsInited = false;
        this.connectWebsocket = true;
        if (this.hubConnection) {
            this.hubConnection.stop();
        }

        this.dataService.NavigateHostelKeySex(sex, this.contingentArrival);
    }

    sum(arr: number[]) {
        return arr.reduce((a, b) => a + b, 0);
    }
}
