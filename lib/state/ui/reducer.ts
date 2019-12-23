import { difference, union } from 'lodash';
import { combineReducers } from 'redux';
import * as ActionTypes from '../action-types';
import { EditorMode } from '../../types';

const defaultVisiblePanes = ['editor', 'noteList'];

const editorMode = (
  state: EditorMode = 'edit',
  { type, mode }: { type: string; mode: EditorMode }
): EditorMode => {
  switch (type) {
    case ActionTypes.CREATE_NOTE:
      return 'edit';
    case ActionTypes.EDITOR_MODE_SET:
      return mode;
    default:
      return state;
  }
};

const visiblePanes = (
  state = defaultVisiblePanes,
  { type, show }: { type: string; show: boolean }
) => {
  if (ActionTypes.TAG_DRAWER_TOGGLE === type) {
    return show
      ? union(state, ['tagDrawer'])
      : difference(state, ['tagDrawer']);
  }

  return state;
};

export default combineReducers({ editorMode, visiblePanes });
