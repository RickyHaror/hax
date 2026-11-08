import type { Mission, Season } from '../engine/types';
import { s1m1ToyShop } from './s1-m1-toy-shop';
import { s1m2StickyNote } from './s1-m2-sticky-note';
import { s1m3HiddenFolder } from './s1-m3-hidden-folder';

export const season1: Season = {
  id: 's1',
  number: 1,
  title: 'Corner Town',
  blurb: 'Help your town find and fix small security holes.',
  requires: null,
  missions: [
    's1-m1-toy-shop',
    's1-m2-sticky-note',
    's1-m3-hidden-folder',
    's1-m4-page-source',
    's1-m5-log-search',
    's1-m6-weak-password',
  ],
};

export const season1Missions: Mission[] = [s1m1ToyShop, s1m2StickyNote, s1m3HiddenFolder];
