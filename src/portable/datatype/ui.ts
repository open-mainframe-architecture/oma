import { Sources } from 'oma/datatype'

export default {
  // a widget serves a single purpose in a virtual user interface
  'UI.Widget': {
    // a hidden widget is not rendered
    hidden: 'Flag',
    // semantic widget status with style names
    status: 'Maybe(string|[string])',
    // render order index if widget is part of dictionary layout
    index: '?number'
  },
  // a layout widget renders zero or more child widgets
  'UI.Layout': {
    arguments$: 'W=UI.Widget',
    super$: 'UI.Widget',
    // layouts might have children
    widgets: 'Maybe([W]|<W>)'
  },
  // a decorator widget wraps an optional child widget
  'UI.Decorator': {
    arguments$: 'W=UI.Widget',
    super$: 'UI.Widget',
    // decorators might have dedicated children
    subject: '?W'
  },
  // an input widget translates user interactions to actions in virtual user interface
  'UI.Input': {
    super$: 'UI.Widget',
    // a disabled widget cannot interact
    disabled: 'Flag',
    // an unchained widget is taken out of the chain with focusable widgets
    unchained: 'Flag'
  },
  // an output widget displays noninteractive texts and graphics
  'UI.Output': {
    super$: 'UI.Widget',
    // optional symbolic identifier for i18n purposes
    symbol: '?string'
  },
  // length is a numeric measurement in a spatial unit
  'UI.Length': {
    n: 'number',
    u: '"ch"_"em"_"ex"_"px"_"rem"'
  },
  // size is either explicit length or proportional number between 0 (0%) and 1 (100%)
  'UI.Size': 'UI.Length|number',
  // sizeable in height and width dimension
  'UI.Sizeable': {
    height: '?UI.Size',
    width: '?UI.Size'
  },
  // a sizeable frame widget surrounds a decorated subject
  'UI.Frame': {
    arguments$: 'W=UI.Widget',
    super$: 'UI.Decorator(W)+UI.Sizeable',
  },
  // a metal frame creates a layout surface for magnets
  'UI.Metal': {
    arguments$: 'W=UI.Widget,M=UI.Magnet',
    super$: 'UI.Frame(W)+UI.Layout(M)'
  },
  // position of magnet frame is relative to metallic surface
  'UI.Magnet': {
    arguments$: 'W=UI.Widget,M=UI.Magnet',
    super$: 'UI.Metal(W,M)',
    // fixate left position, relative to top left corner of metallic surface
    // if sizeable width is negative, also fixate the right position
    left: '?UI.Size',
    // fixate top position, relative to top left corner of metallic surface
    // if sizeable height is negative, also fixate the bottom position
    top: '?UI.Size',
    // translate horizontally, relative to dimension of decorated subject
    translationX: '?UI.Size',
    // translate vertically, relative to dimension of decorated subject
    translationY: '?UI.Size'
  },
  // items flow in a list
  'UI.Flow.Direction': '"row"_"rowReverse"_"column"_"columnReverse"',
  'UI.Flow.Cut': '"wrap"_"never"_"reverse"',
  'UI.Flow.Justification': '"start"_"end"_"center"_"between"_"around"',
  'UI.Flow.Alignment': '"stretch"_"start"_"end"_"center"_"baseline"',
  'UI.Flow.ContentAlignment': '"stretch"_"start"_"end"_"center"_"between"_"around"',
  // a list layout mimics a CSS flexbox
  'UI.List': {
    super$: 'UI.Layout(UI.Item)+UI.Sizeable',
    direction: '?UI.Flow.Direction',
    cut: '?UI.Flow.Cut',
    justification: '?UI.Flow.Justification',
    itemAlignment: '?UI.Flow.ItemAlignment',
    contentAlignment: '?UI.Flow.ContentAlignment'
  },
  // an item decorates a widget in a list layout
  'UI.Item': {
    super$: 'UI.Decorator',
    // control relative growth
    grows: '?number',
    // control relative shrinkage
    shrinks: '?number',
    // base size in list
    basis: 'number',
    // override item alignment
    alignment: '?UI.Flow.Alignment',
  },
  // show lines with textual content
  'UI.Text': {
    super$: 'UI.Output',
    content: '?Text'
  },
  // show content of graphics image
  'UI.Image': {
    super$: 'UI.Output',
    asset: '?string'
  },
  // an icon shows an image with a text
  'UI.Icon': {
    super$: 'UI.Image+UI.Text',
    direction: '?UI.Flow.Direction'
  },
  'UI.Scroll': {
    super$: 'UI.Input+UI.Frame',
    scrollX: '?number @data=both @delay=flush',
    scrollY: '?number @data=both @delay=flush'
  },
  'UI.Button': {
    super$: 'UI.Input+UI.Decorator',
    click: '?UI.Event.Click @event=client @delay=forever'
  },
  'UI.Selection': 'UI.Input+UI.Layout(UI.Choice)',
  'UI.Choice': {
    super$: 'UI.Button',
    unchained: 'none',
    selected: 'Flag'
  },
  'UI.RadioList': {
    super$: 'UI.Selection',
    direction: '?UI.Flow.Direction'
  },
  'UI.CheckList': {
    super$: 'UI.Selection',
    direction: '?UI.Flow.Direction'
  },
  // monitor resolution and color depth (effective resolution subtracts space for taskbars)
  'UI.Resolution': {
    colorDepth: 'number',
    pixel: 'Area',
    effectivePixel: 'Area'
  },
} as Sources