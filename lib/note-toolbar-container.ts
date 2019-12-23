import { cloneElement, Component, ReactElement } from 'react';
import { connect } from 'react-redux';
import { get, includes } from 'lodash';

import analytics from './analytics';
import appState from './flux/app-state';
import { toggleFocusMode } from './state/settings/actions';
import DialogTypes from '../shared/dialog-types';
import filterNotes from './utils/filter-notes';

import { State } from './state';
import * as T from './types';

const mapStateToProps = ({ appState: state }: State) => ({
  isViewingRevisions: state.isViewingRevisions,
  revisionOrNote: state.revision || state.note,
  stateForFilterNotes: {
    filter: state.filter,
    notes: state.notes,
    showTrash: state.showTrash,
    tag: state.tag,
  },
});

const {
  closeNote,
  deleteNoteForever,
  noteRevisions,
  restoreNote,
  setIsViewingRevisions,
  showDialog,
  toggleNoteInfo,
  trashNote,
} = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  closeNote: () => dispatch(closeNote()),
  deleteNoteForever: args => dispatch(deleteNoteForever(args)),
  noteRevisions: args => dispatch(noteRevisions(args)),
  restoreNote: args => dispatch(restoreNote(args)),
  setIsViewingRevisions: isViewingRevisions => {
    dispatch(setIsViewingRevisions({ isViewingRevisions }));
  },
  shareNote: () => dispatch(showDialog({ dialog: DialogTypes.SHARE })),
  toggleFocusMode: () => dispatch(toggleFocusMode()),
  toggleNoteInfo: () => dispatch(toggleNoteInfo()),
  trashNote: args => dispatch(trashNote(args)),
});

type Props = {
  noteBucket: T.Bucket<T.Note>;
  onNoteClosed: Function;
  toolbar: ReactElement;
};

type ConnectedProps = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>;

export class NoteToolbarContainer extends Component<Props & ConnectedProps> {
  // Gets the index of the note located before the currently selected one
  getPreviousNoteIndex = (note: T.NoteEntity) => {
    const filteredNotes = filterNotes(this.props.stateForFilterNotes);

    return Math.max(filteredNotes.findIndex(({ id }) => note.id === id) - 1, 0);
  };

  onCloseNote = () => {
    this.props.closeNote();
    this.props.onNoteClosed();
  };

  onTrashNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.trashNote({ noteBucket, note, previousIndex });
    this.props.onNoteClosed();
    analytics.tracks.recordEvent('editor_note_deleted');
  };

  onDeleteNoteForever = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.deleteNoteForever({ noteBucket, note, previousIndex });
    this.props.onNoteClosed();
  };

  onRestoreNote = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    const previousIndex = this.getPreviousNoteIndex(note);
    this.props.restoreNote({ noteBucket, note, previousIndex });
    this.props.onNoteClosed();
    analytics.tracks.recordEvent('editor_note_restored');
  };

  onShowRevisions = (note: T.NoteEntity) => {
    const { noteBucket } = this.props;
    this.props.noteRevisions({ noteBucket, note });
    analytics.tracks.recordEvent('editor_versions_accessed');
  };

  onShareNote = () => {
    this.props.shareNote();
    analytics.tracks.recordEvent('editor_share_dialog_viewed');
  };

  render() {
    const { toolbar } = this.props;
    const handlers = {
      onCloseNote: this.onCloseNote,
      onDeleteNoteForever: this.onDeleteNoteForever,
      onRestoreNote: this.onRestoreNote,
      onShowNoteInfo: this.props.toggleNoteInfo,
      onShowRevisions: this.onShowRevisions,
      onShareNote: this.onShareNote,
      onTrashNote: this.onTrashNote,
      setIsViewingRevisions: this.props.setIsViewingRevisions,
      toggleFocusMode: this.props.toggleFocusMode,
    };
    const { revisionOrNote, isViewingRevisions } = this.props;

    const systemTags = get(revisionOrNote, 'data.systemTags', []);
    const markdownEnabled = includes(systemTags, 'markdown');

    if (isViewingRevisions) {
      return null;
    }

    return cloneElement(toolbar, { ...handlers, markdownEnabled });
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NoteToolbarContainer);
