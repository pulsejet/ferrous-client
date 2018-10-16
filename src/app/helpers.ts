import { PageEvent } from '@angular/material/paginator';

/** Helper for using Angular Paginator */
export class PaginatorHelper {
    /** Default page size */
    pageSize = 100;

    /** Default options for page size */
    pageSizeOptions: number[] = [5, 10, 25, 100, 200, 500, 1000, 5000, 10000];

    /** Event handler for changed size */
    pageEvent: PageEvent;

    /** Returns a sliced array from the current state of the paginator
     *  @param {any[]} array Input array to slice
     */
    public paginate(array: any[]): any[] {
        if (this.pageEvent) {
            const start = this.pageEvent.pageIndex * this.pageEvent.pageSize;
            return array.slice(start, start + this.pageEvent.pageSize);
        } else {
            return array.slice(0, this.pageSize);
        }
    }
}

/** Check and mark duplicates in a contingent arrival */
export function checkDuplicates(ca: ContingentArrival): boolean {
    const minos = [];
    ca.caPeople.forEach(m => {
      m.flags = m.flags.replace('DUP', '');
      if (minos.includes(m.mino)) {
        m.flags += 'DUP';
      } else {
        minos.push(m.mino);
      }
    });
    return !(minos.length === ca.caPeople.length);
}

/* Click Stop Propagation */
import { Directive, HostListener } from '@angular/core';
import { ContingentArrival } from './interfaces';

@Directive({
    selector: '[appClickStopPropagation]'
})
/** Stops propagation of clicks to elements below */
export class ClickStopPropagationDirective {
    @HostListener('click', ['$event'])
    public onClick(event: any): void {
        event.stopPropagation();
    }
}
