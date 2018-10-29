import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RoomAllocation, Room, ContingentArrival, EnumContainer, Link, Contingent, Building } from './interfaces';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import * as uriTemplates from 'uri-templates';

const SF_RoomLayouts_URL = '/assets/room-templates/';

let JSON_HEADERS = new HttpHeaders();
JSON_HEADERS = JSON_HEADERS.set('Content-Type', 'application/json');

const API_SPEC_URL = environment.api_url;

/* Main Data Service */
@Injectable()
export class DataService {

    /** Stores the API_SPEC */
    public _API_SPEC: Link[];

    /** True whenever any user is logged in */
    public loggedIn = false;

    /** Can be used for passing data between components */
    public passedData: any;

    /** Hostel keys for skipping location select screen */
    public hostelKeys = {
        M: 'M',
        F: 'F'
    };

    /**
     * Set the static passed data
     * @param data Data to store
     */
    SetPassedData(data: any): void { this.passedData = data; }

    /** Gets the stored data */
    GetPassedData(): any { return this.passedData; }

    constructor(private http: HttpClient, public router: Router) { }

    public RefreshAPISpec(): Observable<any> {
        return this.http.get<Link[]>(API_SPEC_URL);
    }

    public GetAPISpec() {
        return this._API_SPEC;
    }

    /**
     * Check if link of given rel exists
     * @param links Array of links
     * @param rel Required rell
     */
    CheckIfLink(links: Link[], rel: string = 'self'): boolean {
        if (links == null) {
            return false;
        }

        const found = links.find(x => x.rel === rel);
        if (found == null) {
            return false;
        }
        return true;
    }

    /**
     * Get link from rel
     * @param links Array of links
     * @param rel Required rell
     * @param encoded Returns encoded object if true
     */
    GetLink(links: Link[], rel: string = 'self'): Link {
        const found = links.find(x => x.rel === rel);
        if (found == null) {
            return {} as Link;
        }
        return found as Link;
    }

    /**
     * Retrn the link with rel "self"
     * @param links Array of links
     * @param encoded Returns encoded string if true
     */
    GetLinkSelf(links: Link[]): Link { return this.GetLink(links, 'self'); }

    /**
     * Retrn the link with rel "update"
     * @param links Arrar of links
     * @param encoded Returns enocded string if true
     */
    GetLinkUpdate(links: Link[]): Link { return this.GetLink(links, 'update'); }

    /**
     * Returns the link with rel "delete"
     * @param links Array of links
     */
    GetLinkDelete(links: Link[]): Link { return this.GetLink(links, 'delete'); }

    /**
     * Return the string with rel "create"
     * @param links Array of links
     * @param encoded Returns encoded string if true
     */
    GetLinkCreate(links: Link[]): Link { return this.GetLink(links, 'create'); }

    /**
     * Fires the link with rel "self"
     * @param links Array of links
     */
    FireLinkSelf<T>(links: Link[]): Observable<T> { return this.FireLink<T>(this.GetLinkSelf(links)); }

    /**
     * Fires the link with rel "update"
     * @param links Array of links
     * @param body JSON body to upload
     */
    FireLinkUpdate<T>(links: Link[], body: any): Observable<T> { return this.FireLink<T>(this.GetLinkUpdate(links), body); }

    /**
     * Fires the link with rel "delete"
     * @param links Array of links
     */
    FireLinkDelete<T>(links: Link[]): Observable<T> { return this.FireLink<T>(this.GetLinkDelete(links)); }

    /**
     * Encode an object for passing through URL
     * @param o Object to encode
     */
    EncodeObject(o: any): string { return btoa(JSON.stringify(o)); }

    /**
     * Decode an object encoded with "EncodeObject"
     * @param s Encoded string
     */
    DecodeObject<T>(s: string): T { return JSON.parse(atob(s)) as T; }

    /**
     * Fire a link and return the result as an observable
     * @param link Link to fire
     * @param body Optional body to upload only for POST and PUT requests
     * @param options Optional query or URL parameters to fill
     */
    FireLink<T>(link: Link, body: any = null, options: any = {}): Observable<T> {
        /* Fill in parameters */
        const URL = this.FillURITemplate(link, options).href;

        /* Use the correct verb */
        switch (link.method) {
            case 'GET':
                return this.http.get<T>(URL);
            case 'POST':
                return this.http.post<T>(URL, body, { headers: JSON_HEADERS });
            case 'PUT':
                return this.http.put<T>(URL, body, { headers: JSON_HEADERS });
            case 'DELETE':
                return this.http.delete<T>(URL);
            default:
                throw new Error('no method defined for ' + URL);
        }
    }

    /**
     * Returns a copy of a Link with filled template fields
     * @param link Link with URI template
     * @param options Parameter data to fill
     */
    FillURITemplate(link: Link, options: any): Link {
        /* A copy is returned to prevent modifying the original
         * This is necessary since the template may be static
         * e.g. in the API spec */
        const newLink = { ... link };
        const URITemplate = uriTemplates(link.href);
        newLink.href = URITemplate.fill(options);
        return newLink;
    }

    /* === Navigate - voids === */

    /**
     * Navigate to list of Contingents
     */
    NavigateContingentsList(): void {
        this.router.navigate(['/contingent/']);
    }

    NavigateContingentDetails(link: Link, newRecord: boolean = false): void {
        this.router.navigate(['/contingent', this.EncodeObject(link), (newRecord ? '1' : '0')]);
    }

    NavigateDesk1(link: Link): void {
        this.router.navigate(['/desk1', this.EncodeObject(link)]);
    }

    NavigateDesk2(link: Link): void {
        this.router.navigate(['/desk2', this.EncodeObject(link)]);
    }

    /** Navigate to Desk 1 with PIN */
    Desk1(pin: string) {
        this.NavigateDesk1(this.FillURITemplate(
            this.GetLink(this.GetAPISpec(), 'desk1'),
            { id: pin}
        ));
    }

    /** Navigate to Desk 2 with PIN */
    Desk2(pin: string) {
        this.NavigateDesk2(this.FillURITemplate(
            this.GetLink(this.GetAPISpec(), 'desk1'),
            { id: pin}
        ));
    }

    /**
     * Navigate to list of People
     */
    NavigatePeopleList(): void {
        this.router.navigate(['/person/']);
    }

    /**
     * Navigate to person details
     * @param link "self" link for the person
     * @param newRecord true for creating a new record. If true, link must be the "create" link
     */
    NavigatePersonDetails(link: Link, newRecord: boolean = false): void {
        this.router.navigate(['/person', this.EncodeObject(link), (newRecord ? '1' : '0')]);
    }

    /**
     * Navigate to Location Selection
     * @param ca ContingentArrival for which rooms are being allocated
     * @param clno ContingentLeaderNo
     */
    NavigateLayoutSelect(ca: ContingentArrival, clno: string): void {
        this.router.navigate(['/location-select', this.EncodeObject(this.GetLink(ca.links, 'buildings')), clno]);
    }

    /**
     * Navigate to room layout
     * @param link "self" link for the building
     * @param location Location for local purposes
     * @param clno ContingentLeaderNo for local highlighting
     */
    NavigateRoomLayout(link: Link, location: string, clno: string): void {
        this.router.navigate(['/room-layout', this.EncodeObject(link), location, clno]);
    }

    /** All Contingents */
    GetAllContingents(): Observable<EnumContainer> {
        return this.FireLink<EnumContainer>(this.GetLink(this.GetAPISpec(), 'contingents'));
    }

    /** All People */
    GetAllPeople(): Observable<EnumContainer> {
        return this.FireLink<EnumContainer>(this.GetLink(this.GetAPISpec(), 'people'));
    }

    /**
     * Gets contingent-arrival-specific extended Building[]
     * @param link Link to follow
     */
    GetAllBuildingsExtended(link: Link): Observable<EnumContainer> {
        return this.FireLink<EnumContainer>(link);
    }

    /* === RoomLayout === */

    /**
     * Get room layout HTML
     * @param location Location code
     */
    GetRoomLayout(location: string): Observable<any> {
        return this.http.get(SF_RoomLayouts_URL + location + '.html', { responseType: 'text' });
    }

    /**
     * Returns true if room is fully occupied
     * @param room Room to check
     */
    RoomCheckOccupied(room: Room): boolean {
        return this.RoomGetPartialNo(room) < 0;
    }

    /**
     * Returns if room is partially occupied (returns true even if partial is more than capacity)
     * @param room Room to check
     */
    RoomCheckPartial(room: Room): boolean {
        return this.RoomGetPartialNo(room) > 0;
    }

    /**
     * Get number of people occupying room partially
     * @param room Room to check
     */
    RoomGetPartialNo(room: Room): number {
        let count = 0;
        for (const roomA of room.roomAllocation.filter(ra => ra.partial != null)) {
            count += Number(roomA.partial);
        }
        return count;
    }

    /**
     * Fires the "delete" link in a RoomAllocation
     * @param roomA RoomAllocation object
     */
    UnallocateRoom(roomA: RoomAllocation): Observable<any> {
        return this.FireLinkDelete(roomA.links);
    }

    /* === Quick Extras which shouldn't be here === */

    /**
     * Returns true if object is a valid number (in range)
     * @param num object to be checked
     * @param min optional minimum bound (defaults to -999999)
     * @param max optional maximum bound (defaults to +999999)
     */
    CheckValidNumber(num: number, min: number = -999999, max: number = 999999): boolean {
        return (num != null &&
            !isNaN(Number(num)) &&
            Number(num) >= min &&
            Number(num) <= max);
    }

    /**
     * Get if a user is logged in
     * TODO: Do this with the API spec
     */
    GetCurrentUser(): Observable<any> {
        return this.FireLink(this.GetLink(this.GetAPISpec(), 'getuser'));
    }

    /**
     * Logs in the user with the provided credentials
     * @param username Username
     * @param password Password
     */
    Login(username: string, password: string): Observable<any> {
        return this.FireLink(this.GetLink(this.GetAPISpec(), 'login'), null,
                             {username: username, password: password});
    }

    /**
     * End the session
     */
    Logout(): Observable<any> {
        return this.FireLink(this.GetLink(this.GetAPISpec(), 'logout'));
    }

    /* ======================== Data Helpers =============================== */

    /**
     * Compute number of people arrived (approved from Desk 1)
     * @param female true returns number of females
     */
    public GetArrivedContingent(contingent: Contingent, female: boolean): string {
        if (!contingent.contingentArrival) { return ''; }

        let curr = 0;
        let currO = 0;

        for (const ca of contingent.contingentArrival) {
            if (ca.approved) {
                curr += Number(female ? ca.female : ca.male);
                currO += Number(female ? ca.femaleOnSpot : ca.maleOnSpot);
            }
        }

        if (currO > 0) {
            return curr + ' + ' + currO;
        } else {
            return curr.toString();
        }
    }

    /**
     * Get no of people by sex
     * @param female true for Female
     */
    public GetPeopleBySex(contingent: Contingent, female: boolean): string {
        if (!contingent.person) { return ''; }

        let curr = 0;

        /* Count people */
        for (const person of contingent.person) {
            if (person.sex && ((female && person.sex.toUpperCase() === 'F') ||
                (!female && person.sex.toUpperCase() === 'M'))) {
                curr++;
            }
        }

        return curr.toString();
    }

    /** Navigate to hostel key layout by sex */
    public NavigateHostelKeySex(sex: string, ca: ContingentArrival) {
        /* Save preferences */
        window.localStorage.setItem('hostelKeys', JSON.stringify(this.hostelKeys));
        this.NavigateHostelByLocation(this.hostelKeys[sex], ca);
    }

    /**
     * Navigate to hostel location with location
     * @param loc Location name to navigate to
     * @param ca Contingent Arrival object
     */
    public NavigateHostelByLocation(loc: string, ca: ContingentArrival) {
        /* Get list of buildings */
        this.FireLink<Building[]>(
            this.GetLink(ca.links, 'buildings-min')
        ).subscribe(buildings => {
            /* Find the building we want */
            const building = buildings.find(b => b.location.toUpperCase() === loc.toUpperCase());

            /* Show error */
            if (building == null) {
                alert('You seem to have chosen a wrong hostel');
                return;
            }

            /* Skip to allotment */
            this.NavigateRoomLayout(
                this.GetLinkSelf(building.links),
                loc,
                ca.contingentLeaderNo
            );
        });
    }
}
