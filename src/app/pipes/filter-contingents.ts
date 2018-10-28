import { Pipe, PipeTransform } from '@angular/core';
import { Contingent } from '../interfaces';

function isub(str: string, sub: string) {
    return str.toUpperCase().includes(sub.toUpperCase());
}

@Pipe({
    name: 'filter_contingents',
    pure: false
})
export class FilterContingents implements PipeTransform {
    transform(items: Contingent[], clno: string): any {
        if (!items || !clno) {
            return items;
        }

        return items.filter(item => isub(item.contingentLeaderNo, clno));
    }
}
