import React, { Component, KeyboardEvent } from 'react';
import { connect } from 'react-redux';
import { isEmpty } from 'lodash';
import SmallCrossIcon from '../icons/cross-small';
import appState from '../flux/app-state';
import { tracks } from '../analytics';

import { State } from '../state';

const { search, setSearchFocus } = appState.actionCreators;
const { recordEvent } = tracks;
const KEY_ESC = 27;

type Props = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>;

export class SearchField extends Component<Props> {
  static displayName = 'SearchField';

  componentDidUpdate(prevProps: Props) {
    const { searchFocus, onSearchFocused, filter } = this.props;

    if (searchFocus && this.inputField) {
      this.inputField.select();
      this.inputField.focus();
      onSearchFocused();
    }

    // check to see if the filter has been updated (by a tag being clicked from suggestions)
    // this is a hack to work around query not being in app state (yet)
    if (filter !== prevProps.filter) {
      this.inputField.value = filter;
    }
  }

  interceptEsc = (event: KeyboardEvent<HTMLInputElement>) => {
    if (KEY_ESC === event.keyCode) {
      if (this.props.filter === '') {
        this.inputField.blur();
      }
      this.clearQuery();
    }
  };

  storeInput = r => (this.inputField = r);

  update = (event: React.FormEvent<HTMLInputElement>) => {
    this.props.onSearch(event.currentTarget.value);
  };

  clearQuery = () => this.props.onSearch('');

  render() {
    const { filter, isTagSelected, placeholder } = this.props;
    const hasQuery = filter.length > 0;

    const screenReaderLabel =
      'Search ' + (isTagSelected ? 'notes with tag ' : '') + placeholder;

    return (
      <div className="search-field">
        <input
          aria-label={screenReaderLabel}
          ref={this.storeInput}
          type="text"
          placeholder={placeholder}
          onChange={this.update}
          onKeyUp={this.interceptEsc}
          value={filter}
          spellCheck={false}
        />
        <button
          aria-label="Clear search"
          hidden={!hasQuery}
          onClick={this.clearQuery}
        >
          <SmallCrossIcon />
        </button>
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }: State) => ({
  filter: state.filter,
  isTagSelected: !isEmpty(state.tag),
  placeholder: state.listTitle,
  searchFocus: state.searchFocus,
});

const mapDispatchToProps = dispatch => ({
  onSearch: (filter: string) => {
    dispatch(search({ filter }));
    recordEvent('list_notes_searched');
  },
  onSearchFocused: () => dispatch(setSearchFocus({ searchFocus: false })),
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
