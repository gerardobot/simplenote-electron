import { difference, union } from 'lodash';
import { combineReducers } from 'redux';
import { TAG_DRAWER_TOGGLE } from '../action-types';

import * as T from '../../types';

const defaultVisiblePanes = ['editor', 'noteList'];

const emptyList: unknown[] = [];

const filteredNotes = (state = emptyList as T.NoteEntity[], { type, notes }) =>
  'FILTER_NOTES' === type ? notes : state;

const visiblePanes = (state = defaultVisiblePanes, { type, show }) => {
  if (TAG_DRAWER_TOGGLE === type) {
    return show
      ? union(state, ['tagDrawer'])
      : difference(state, ['tagDrawer']);
  }

  return state;
};

export default combineReducers({ filteredNotes, visiblePanes });
