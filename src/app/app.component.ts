import { ChangeDetectorRef, Component, Injectable, OnDestroy } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Title } from '@angular/platform-browser';
import { DataService } from './data.service';
import { Router } from '@angular/router';
import { FerrousIdentity } from './interfaces';

/* TODO: This code comes from the example for the angular   *
 * material side nav. Clean it up and add comments.         */
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
@Injectable()
export class AppComponent implements OnDestroy {
    mobileQuery: MediaQueryList;
    public initialized = false;

    private _mobileQueryListener: () => void;

    constructor(
        changeDetectorRef: ChangeDetectorRef,
        media: MediaMatcher,
        public titleService: Title,
        public dataService: DataService,
        public router: Router) {

        this.mobileQuery = media.matchMedia('(max-width: 600px)');
        this._mobileQueryListener = () => changeDetectorRef.detectChanges();
        this.mobileQuery.addListener(this._mobileQueryListener);

        /* Load preferences */
        const hostelKeys = window.localStorage.getItem('hostelKeys');
        if (hostelKeys !== null) {
            this.dataService.hostelKeys = JSON.parse(hostelKeys);
        }

        /* Get API Spec */
        this.dataService.RefreshAPISpec().subscribe(api => {
            this.dataService._API_SPEC = api;

            this.dataService.GetCurrentUser().subscribe(result => {
                this.dataService.loggedIn = true;
                this.initialized = true;
                this.dataService.identity = result;
            }, () => {
                this.dataService.loggedIn = false;
                this.initialized = true;
                this.dataService.identity = { username: '' } as FerrousIdentity;
            });
        });
    }

    ngOnDestroy(): void {
        this.mobileQuery.removeListener(this._mobileQueryListener);
    }

    logout() {
        this.dataService.Logout().subscribe(() => {
            this.dataService.loggedIn = false;

            this.dataService.RefreshAPISpec().subscribe(api => {
                this.dataService._API_SPEC = api;
            });

            this.dataService.identity = { username: '' } as FerrousIdentity;
        });
    }

    isGuest() {
        return this.router.url.includes('/register');
    }
}
