import looseEqual from '../../../utils/loose-equal'
import { isArray } from '../../../utils/array'
import sanitizeRow from './sanitize-row'

export default {
  props: {
    selectable: {
      type: Boolean,
      default: false
    },
    selectMode: {
      type: String,
      default: 'multi'
    },
    selectedVariant: {
      type: String,
      default: 'primary'
    }
  },
  data() {
    return {
      selectedRows: [],
      selectedLastRow: -1
    }
  },
  computed: {
    isSelecting() {
      return (
        this.selectable &&
        this.selectMode === 'range' &&
        this.selectedRows &&
        this.selectedRows.some(Boolean)
      )
    }
  },
  watch: {
    computedItems(newVal, oldVal) {
      // Reset for selectable
      // TODO: Should selectedLastClicked be reset here?
      //       As changes to _showDetails would trigger it to reset
      this.selectedLastRow = -1
      let equal = false
      if (this.selectable && this.selectedRows.length > 0) {
        // Quick check against array length
        equal = isArray(newVal) && isArray(oldVal) && newVal.length === oldVal.length
        for (let i = 0; equal && i < newVal.length; i++) {
          // Look for the first non-loosely equal row, after ignoring reserved fields
          equal = looseEqual(sanitizeRow(newVal[i]), sanitizeRow(oldVal[i]))
        }
      }
      if (!equal) {
        this.clearSelected()
      }
    },
    selectable(newVal, oldVal) {
      this.clearSelected()
      this.setSelectionHandlers(newVal)
    },
    selectMode(newVal, oldVal) {
      this.clearSelected()
    },
    selectedRows(selectedRows, oldVal) {
      if (this.selectable && !looseEqual(selectedRows, oldVal)) {
        let items = []
        // forEach skips over non-existant indicies (on sparse arrays)
        selectedRows.forEach((v, idx) => {
          if (v) {
            items.push(this.computedItems[idx])
          }
        })
        this.$emit('row-selected', items)
      }
    }
  },
  beforeMount() {
    // Set up handlers
    if (this.selectable) {
      this.setSelectionHandlers(true)
    }
  },
  methods: {
    isRowSelected(idx) {
      return Boolean(this.selectedRows[idx])
    },
    rowSelectedClasses(idx) {
      if (this.selectable) {
        const rowSelected = this.isRowSelected(idx)
        const base = this.dark ? 'bg' : 'table'
        const variant = this.selectedVariant
        return {
          'b-row-selected': rowSelected,
          [`${base}-${variant}`]: rowSelected && variant
        }
      } else {
        return {}
      }
    },
    clearSelected() {
      let hasSelection = this.selectedRows.reduce((prev, v) => {
        return prev || v
      }, false)
      if (hasSelection) {
        this.selectedLastClicked = -1
        this.selectedRows = []
      }
    },
    setSelectionHandlers(on) {
      const method = on ? '$on' : '$off'
      // Handle row-clicked event
      this[method]('row-clicked', this.selectionHandler)
      // Clear selection on filter, pagination, and sort changes
      this[method]('filtered', this.clearSelected)
      this[method]('context-changed', this.clearSelected)
    },
    selectionHandler(item, index, evt) {
      /* istanbul ignore if: should never happen */
      if (!this.selectable) {
        // Don't do anything if table is not in selectable mode
        /* istanbul ignore next: should never happen */
        this.clearSelected()
        /* istanbul ignore next: should never happen */
        return
      }
      let selectedRows = this.selectedRows.slice()
      let selected = !selectedRows[index]
      let mode = this.selectMode
      // Note 'multi' mode needs no special handling
      if (mode === 'single') {
        selectedRows = []
      } else if (mode === 'range') {
        if (this.selectedLastRow > -1 && evt.shiftKey) {
          // range
          for (
            let idx = Math.min(this.selectedLastRow, index);
            idx <= Math.max(this.selectedLastRow, index);
            idx++
          ) {
            // this.$set(this.selectedRows, idx, true)
            selectedRows[idx] = true
          }
          selected = true
        } else {
          if (!(evt.ctrlKey || evt.metaKey)) {
            // clear range selection if any
            selectedRows = []
            selected = true
          }
          this.selectedLastRow = selected ? index : -1
        }
      }
      // this.$set(this.selectedRows, index, selected)
      selectedRows[index] = selected
      this.selectedRows = selectedRows
    }
  }
}