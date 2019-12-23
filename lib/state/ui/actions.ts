import * as ActionTypes from '../action-types';

import { EditorMode } from '../../types';

export const createNote = () => ({
  type: ActionTypes.CREATE_NOTE,
});

export const setEditorMode = (mode: EditorMode) => ({
  type: ActionTypes.EDITOR_MODE_SET,
  mode,
});

export const toggleTagDrawer = (show: boolean) => ({
  type: ActionTypes.TAG_DRAWER_TOGGLE,
  show,
});
