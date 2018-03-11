import {trigger, state, style, transition,
        animate, group, query, stagger, keyframes} from '@angular/animations';

export const SlideInOutAnimation = [
    trigger('slideInOut', [
        transition(':enter', [
          style({transform: 'translateX(-20px)', opacity: '0', 'max-height': '0'}),
          animate('100ms', style({'max-height': 'none'})),
          animate('200ms ease-in', style({transform: 'translateX(0%)', opacity: '1'})),
        ]),
        transition(':leave', [
          animate('200ms ease-in', style({transform: 'translateX(20px)', opacity: '0'})),
          animate('100ms', style({height: '0'})),
        ])
    ])
];
