import * as React from 'react'

import { debounce, moveCursorToTheEnd } from '../../../Utils'
import WithRoot from '../../../withRoot'

import TextField from 'material-ui/TextField'
import ButtonBase from 'material-ui/ButtonBase'
import Modal from 'material-ui/Modal'

import { Theme, withStyles, WithStyles } from 'material-ui/styles'
import i18n, { i18nGroup } from 'es2015-i18n-tag'
import Scopes from '../../../i18n/Scopes'

// When input field is focusing, we set a timeout to halt any
// value changes — so when deleting a forwardstanding atom
// backspace, the first symbol of the now-focused atom doesn't
// gets eaten instantly. The number is based on the typical
// keypress timings (which are 50-300ms, here we use a medium value).
// https://stackoverflow.com/questions/22505698/what-is-a-typical-keypress-duration
const FOCUS_DURATION: number = 175
const DOUBLE_CLICK_DEBOUNCE_TIME: number = 200
const BACKSPACE_KEYCODE: number = 8

export interface ILineEditorAtomProps {
    id: string,
    selected?: boolean,
    editmode?: boolean,
    atom?: Epistle.ILineAtom,
    onChange: (id: string, atom: Epistle.ILineAtom) => any,
    onClick: (id: string) => any,
    onSpace: (atom: Epistle.ILineAtom, id: string, tail: string) => any,
    onEnterEdit?: (id: string) => any,
    onBlur?: (id: string) => any,
    onDelete: (id: string) => any
}

const style = (theme: Theme) => ({
    selected: {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.getContrastText(theme.palette.secondary.main)
    },
    button: {
        fontSize: theme.typography.button.fontSize,
        padding: `${theme.spacing.unit}px ${theme.spacing.unit / 2}px`,
        transition: 'background-color 0.4s'
    },
    input: {
        fontSize: theme.typography.button.fontSize
    }
})

export type PropsWithStyle = ILineEditorAtomProps & WithStyles<'selected' | 'button' | 'input'>

export interface ILineEditorAtomState {
    mode: 'VIEW' | 'EDIT',
    isEmpty: boolean
}

const defaultAtom: Epistle.ILineAtom = {
    type: 'WORD',
    value: ''
}

@i18nGroup(Scopes.LINE_EDITOR)
export class LineAtom extends React.PureComponent<PropsWithStyle, ILineEditorAtomState> {
    public props: PropsWithStyle

    constructor (props: PropsWithStyle) {
        super(props)

        this.state = {
            mode: props.editmode || !props.atom ? 'EDIT' : 'VIEW',
            isEmpty: !(props.atom && props.atom.value)
        }
    }

    private renderChip () {
        let doubleClicked: boolean = false
        const atom: Epistle.ILineAtom = this.props.atom ? this.props.atom : defaultAtom
        const handleDoubleClick = () => {
            doubleClicked = true
            this.props.onEnterEdit(this.props.id)
        }
        const handleClick = debounce(() => {
            if (!doubleClicked) {
                this.props.onClick(this.props.id)
            }
        }, DOUBLE_CLICK_DEBOUNCE_TIME)
        const nativeButtonProps = {
            label: i18n`Click to select; double click to edit`
        }
        return (
            <ButtonBase
                className={this.props.selected ? `${this.props.classes.button} ${this.props.classes.selected}` : this.props.classes.button}
                onDoubleClick={handleDoubleClick}
                onClick={handleClick}
                {...nativeButtonProps}
            >
                {atom.value}
            </ButtonBase>
        )
    }

    private renderIntput () {
        let isFocusing: boolean = false
        const atom: Epistle.ILineAtom = this.props.atom ? this.props.atom : defaultAtom
        const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
            const value = event.target.value.replace(/\s+/g, ' ') // Deal with multiple spaces
            const words = value.split(' ')
            const newAtom: Epistle.ILineAtom = {
                ...atom,
                value: words[0]
            }

            if (isFocusing) {
                return null
            }

            if (value === atom.value || value === ' ') {
                return null
            }

            if (words.length > 1) {
                this.props.onSpace(newAtom, this.props.id, words[words.length - 1])
            } else {
                this.props.onChange(this.props.id, newAtom)
            }
        }
        const handleUnfocus = (event) => {
            if (event.target && event.currentTarget.value !== '') {
                return this.props.onBlur ? this.props.onBlur(this.props.id) : null
            }

            return this.props.onDelete(this.props.id)
        }
        const inputProperties = {
            onBlur: handleUnfocus,
            // className: styles.inputField,
            onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
                isFocusing = true
                moveCursorToTheEnd(event.currentTarget)
                setTimeout(() => isFocusing = false, FOCUS_DURATION)
            },
            className: this.props.classes.input
        }
        const backspaceHandler = (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.keyCode === BACKSPACE_KEYCODE) {
                this.props.onDelete(this.props.id)
            }
        }
        const defaultHandlers = {
            onChange: handleChange
        }
        const handlers = this.state.isEmpty
            ? {
                ...defaultHandlers,
                onKeyDown: backspaceHandler
            } : defaultHandlers

        return (
            <TextField
                autoFocus
                value={atom.value}
                inputProps={inputProperties}
                {...handlers}
            />
        )
    }

    componentWillReceiveProps (nextProps: ILineEditorAtomProps) {
        const state: ILineEditorAtomState = { ...this.state }

        state.mode = nextProps.editmode ? 'EDIT' : 'VIEW'
        state.isEmpty = !(nextProps.atom && nextProps.atom.value)

        return this.setState(state)
    }

    render () {
        switch (this.state.mode) {
        case 'VIEW':
            return this.renderChip()
        default:
            return this.renderIntput()
        }

    }
}

export default withStyles(style)<ILineEditorAtomProps>(LineAtom)
