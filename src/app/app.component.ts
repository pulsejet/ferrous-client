import { ChangeDetectorRef, Component, Injectable, OnDestroy } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Title } from '@angular/platform-browser';
import { DataService } from './data.service';
import { Router } from '@angular/router';

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

        this.dataService.RefreshAPISpec().subscribe(api => {
            this.dataService._API_SPEC = api;

            this.dataService.GetCurrentUser().subscribe(() => {
                this.dataService.loggedIn = true;
                this.initialized = true;
            }, () => {
                this.dataService.loggedIn = false;
                this.initialized = true;
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

        });
    }

    isGuest() {
        return this.router.url.includes('/register');
    }
}
