/**
 * @module NoteList
 *
 * This module includes some ugly code.
 * The note list display is a significant source of
 * visual re-render lag for accounts with many notes.
 * The trade-offs in this file reflect a decision to
 * optimize heavy inner loops for performance over
 * code burden.
 *
 * Any changes to this code which could affect the
 * row height calculations should be double-checked
 * against performance regressions.
 */
import React, { Component, Fragment, createRef } from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  ListRowRenderer,
} from 'react-virtualized';
import PublishIcon from '../icons/feed';
import classNames from 'classnames';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import filterNotes from '../utils/filter-notes';
import getNoteTitleAndPreview from './get-note-title-and-preview';
import {
  decorateWith,
  checkboxDecorator,
  makeFilterDecorator,
} from './decorators';
import TagSuggestions, { getMatchingTags } from '../tag-suggestions';

import { State } from '../state';
import * as T from '../types';

AutoSizer.displayName = 'AutoSizer';
List.displayName = 'List';

const heightCache = new CellMeasurerCache({
  defaultHeight: 21 + 18 + 24 * 4,
  fixedWidth: true,
});

/**
 * Renders an individual row in the note list
 *
 * @see react-virtual/list
 *
 * @returns does the actual rendering for the List
 */
const renderNote = (
  notes: T.NoteEntity[],
  {
    filter,
    noteDisplay,
    selectedNoteId,
    onNoteOpened,
    onSelectNote,
    onPinNote,
    isSmallScreen,
  }: Pick<
    Props,
    | 'filter'
    | 'noteDisplay'
    | 'selectedNoteId'
    | 'onNoteOpened'
    | 'onSelectNote'
    | 'onPinNote'
    | 'isSmallScreen'
  >
): ListRowRenderer => ({ index, key, parent, style }) => {
  const note = notes[index];

  const { title, preview } = getNoteTitleAndPreview(note);
  const isPinned = note.data.systemTags.includes('pinned');
  const isPublished = note.data.publishURL && note.data.publishURL.length > 0;

  const classes = classNames('note-list-item', {
    'note-list-item-selected': !isSmallScreen && selectedNoteId === note.id,
    'note-list-item-pinned': isPinned,
    'published-note': isPublished,
  });

  const decorators = [checkboxDecorator, makeFilterDecorator(filter)];

  const selectNote = () => {
    onSelectNote(note.id);
    onNoteOpened();
  };

  return (
    <CellMeasurer
      cache={heightCache}
      columnIndex={0}
      key={key}
      parent={parent}
      rowIndex={index}
    >
      <div style={style} className={classes}>
        <div
          className="note-list-item-pinner"
          tabIndex={0}
          onClick={() => onPinNote(note, !isPinned)}
        />
        <div
          className="note-list-item-text theme-color-border"
          tabIndex={0}
          onClick={selectNote}
        >
          <div className="note-list-item-title">
            <span>{decorateWith(decorators, title)}</span>
            {isPublished && (
              <div className="note-list-item-published-icon">
                <PublishIcon />
              </div>
            )}
          </div>
          {'condensed' !== noteDisplay && preview.trim() && (
            <div className="note-list-item-excerpt">
              {decorateWith(decorators, preview)}
            </div>
          )}
        </div>
      </div>
    </CellMeasurer>
  );
};

type ExternalProps = {
  isSmallScreen: boolean;
  onNoteOpened: Function;
};

type ConnectedProps = ReturnType<typeof mapDispatchToProps> &
  ReturnType<typeof mapStateToProps>;

type Props = ExternalProps & ConnectedProps;

export class NoteList extends Component<Props> {
  static displayName = 'NoteList';

  list = createRef<List>();

  componentDidMount() {
    this.toggleShortcuts(true);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.noteDisplay !== this.props.noteDisplay ||
      nextProps.notes !== this.props.notes ||
      nextProps.selectedNoteContent !== this.props.selectedNoteContent
    ) {
      heightCache.clearAll();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const {
      closeNote,
      filter,
      notes,
      onSelectNote,
      selectedNoteId,
    } = this.props;

    // Ensure that the note selected here is also selected in the editor
    if (selectedNoteId !== prevProps.selectedNoteId) {
      onSelectNote(selectedNoteId);
    }

    // Deselect the currently selected note if it doesn't match the search query
    if (filter !== prevProps.filter) {
      const selectedNotePassesFilter = notes.some(
        note => note.id === selectedNoteId
      );
      if (!selectedNotePassesFilter) {
        closeNote();
      }
    }
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
  }

  handleShortcut = (event: KeyboardEvent) => {
    const { ctrlKey, key, metaKey, shiftKey } = event;

    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && shiftKey && (key === 'ArrowUp' || key === 'k')) {
      this.props.onSelectNote(this.props.nextNote.id);

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && (key === 'ArrowDown' || key === 'j')) {
      this.props.onSelectNote(this.props.prevNote.id);

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    return true;
  };

  toggleShortcuts = (doEnable: boolean) => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  render() {
    const {
      filter,
      hasLoaded,
      isSmallScreen,
      noteDisplay,
      notes,
      onEmptyTrash,
      onNoteOpened,
      onPinNote,
      onSelectNote,
      selectedNoteId,
      showTrash,
      tagResultsFound,
    } = this.props;

    const renderNoteRow = renderNote(notes, {
      filter,
      noteDisplay,
      onNoteOpened,
      onSelectNote,
      onPinNote,
      selectedNoteId,
      isSmallScreen,
    });

    const isEmptyList = notes.length === 0;

    const emptyTrashButton = (
      <div className="note-list-empty-trash theme-color-border">
        <button
          type="button"
          className="button button-borderless button-danger"
          onClick={onEmptyTrash}
        >
          Empty Trash
        </button>
      </div>
    );

    const hasTagSuggestions = filter.length > 0 && tagResultsFound > 0;

    return (
      <div className={classNames('note-list', { 'is-empty': isEmptyList })}>
        {isEmptyList ? (
          <span className="note-list-placeholder">
            {hasLoaded ? 'No Notes' : 'Loading Notes'}
          </span>
        ) : (
          <Fragment>
            {hasTagSuggestions && (
              <Fragment>
                <TagSuggestions />
                <div className="note-list-header">Notes</div>
              </Fragment>
            )}
            {notes.length > 0 ? (
              <div className={`note-list-items ${noteDisplay}`}>
                <AutoSizer>
                  {({ height, width }: { height: number; width: number }) => (
                    <List
                      ref={this.list}
                      deferredMeasurementCache={heightCache}
                      estimatedRowSize={24 + 18 + 21 * 4}
                      height={height}
                      noteDisplay={noteDisplay}
                      notes={notes}
                      rowCount={notes.length}
                      rowHeight={heightCache.rowHeight}
                      rowRenderer={renderNoteRow}
                      width={width}
                    />
                  )}
                </AutoSizer>
              </div>
            ) : (
              <div className="note-list is-empty">
                <span className="note-list-placeholder">No Notes</span>
              </div>
            )}
            {showTrash && emptyTrashButton}
          </Fragment>
        )}
      </div>
    );
  }
}

const {
  closeNote,
  emptyTrash,
  loadAndSelectNote,
  pinNote,
} = appState.actionCreators;
const { recordEvent } = tracks;

const mapStateToProps = ({
  appState: state,
  settings: { noteDisplay },
}: State) => {
  const tagResultsFound = getMatchingTags(state.tags, state.filter).length;

  const filteredNotes = filterNotes(state);

  const noteIndex = Math.max(state.previousIndex, 0);
  const selectedNote = state.note ? state.note : filteredNotes[noteIndex];
  const selectedNoteId = selectedNote ? selectedNote.id : state.selectedNoteId;
  const selectedNoteIndex = filteredNotes.findIndex(
    ({ id }) => id === selectedNoteId
  );

  const nextNoteId = Math.max(0, selectedNoteIndex - 1);
  const prevNoteId = Math.min(filteredNotes.length - 1, selectedNoteIndex + 1);

  const nextNote = filteredNotes[nextNoteId];
  const prevNote = filteredNotes[prevNoteId];

  return {
    filter: state.filter,
    hasLoaded: state.notes !== null,
    nextNote,
    noteDisplay,
    notes: filteredNotes,
    prevNote,
    selectedNoteContent: selectedNote ? selectedNote.data.content : '',
    selectedNoteId,
    showTrash: state.showTrash,
    tagResultsFound,
  };
};

const mapDispatchToProps = (
  dispatch,
  { noteBucket }: { noteBucket: T.Bucket<T.Note> }
) => ({
  closeNote: () => dispatch(closeNote()),
  onEmptyTrash: () => dispatch(emptyTrash({ noteBucket })),
  onSelectNote: (noteId: T.EntityId | null) => {
    if (noteId) {
      dispatch(loadAndSelectNote({ noteBucket, noteId }));
      recordEvent('list_note_opened');
    }
  },
  onPinNote: (note: T.NoteEntity, pin: boolean) =>
    dispatch(pinNote({ noteBucket, note, pin })),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteList);
