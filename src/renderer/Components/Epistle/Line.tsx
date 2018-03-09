import * as React from 'react'
import * as shortid from 'shortid'
import * as styles from './Styles/Line.css'

export const paceMappings = new Map<Epistle.TLineAtomPace, number> ([
    ['X-SLOW', 1000],
    ['SLOW', 500],
    ['NORMAL', 250],
    ['FAST', 125],
    ['X-FAST', 50]
])

export interface ILineProps {
    line: Epistle.IEpistleLine
}

interface ILineState {
    queue: Epistle.TLineExecutionQueue | null,
    queueProgress: number
}

export default class Line extends React.PureComponent<ILineProps, ILineState> {
    public props: ILineProps

    constructor (props: ILineProps) {
        super(props)
        this.state = {
            queue: props.line ? Line.ParseLine(props.line.line) : null,
            queueProgress: 0
        }
    }

    /**
     * Converts a series of line atoms into execution queue.
     * 
     * @param atoms ILineAtom[]
     * @returns TLineExecutionQueue 
     */
    public static ParseLine (atoms: Epistle.ILineAtom[]): Epistle.TLineExecutionQueue {
        const breakWord = (word: string, mode: Epistle.TLineAtomArticulation = 'PAIR'): string[] => {
            if (word.length === 1) {
                return [word]
            }

            switch (mode) {
            case 'WORD':
                return [word]
            case 'PAIR':
                return word.length % 2 === 0
                    ? word.match(/\S{2}/g)
                    : [...word.match(/\S{2}/g), word[word.length - 1]]
            case 'LETTER':
                return word.match(/\S/g)
            }
        }

        return atoms.reduce((accumulator: Epistle.TLineExecutionQueue, atom: Epistle.ILineAtom, index: number) => {
            let bodies: Epistle.TLineExecutionQueue = []
            const spaceOperation: Epistle.ILineExecutionOperation = {
                key: shortid.generate() as string,
                timeout: paceMappings.get(atom.pace),
                effect: 'NONE',
                body: ' '
            }

            if (atom.type === 'WORD') {
                bodies = breakWord(atom.value, atom.articulation)
                    .map((value) => {
                        const operation: Epistle.ILineExecutionOperation = {
                            key: shortid.generate() as string,
                            timeout: paceMappings.get(atom.pace),
                            effect: atom.effect || 'NONE',
                            body: value
                        }

                        return operation
                    })

                if (index !== atoms.length - 1) {
                    bodies.push(spaceOperation)
                }

                return [...accumulator, ...bodies]
            }
            // TODO: Implement insertions
            // if (atom.type === 'PAUSE') {
            const pause: Epistle.ILineExecutionOperation = {
                key: shortid.generate() as string,
                timeout: paceMappings.get('X-SLOW'),
                effect: 'NONE',
                body: ''
            }
            return [...accumulator, pause]
        }, [])
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.line) {
            this.setState({
                queue: Line.ParseLine(nextProps.line.line),
                queueProgress: 0
            })
        }
    }

    renderQueue () {
        const queue: Epistle.TLineExecutionQueue = this.state.queue
        const progress: number = this.state.queueProgress

        return queue.map((operation: Epistle.ILineExecutionOperation, index: number) =>
            <span
                className={index <= progress
                    ? styles[`effect-${operation.effect}`] + styles.VISIBLE
                    : styles[`effect-${operation.effect}`]}
                key={operation.key}
            >
                {operation.body}
            </span>
        )
    }

    render () {
        const progress = this.state.queueProgress
        const timeout = this.state.queue[progress].timeout
        const lineLength = this.state.queue.length
        const update = () => this.setState({
            queue: this.state.queue,
            queueProgress: progress + 1
        })
        if (progress < lineLength - 1) {
            setTimeout(update, timeout)
        }

        return <p>{this.renderQueue()}</p>
    }
}
