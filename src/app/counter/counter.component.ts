import { Component } from '@angular/core';

@Component({
    selector: 'app-counter',
    templateUrl: './counter.component.html'
})
export class CounterComponent {
    constructor() { }

    gotdata = '';
    public currentCount = 0;

    public incrementCounter() {
        this.currentCount++;
    }
}
