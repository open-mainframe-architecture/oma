import * as always from 'oma/always'
import * as render from 'oma/dom/render'

const bla = document.createElement('a')

const foo = sessionStorage.getItem('oma-navigator')

export function bar() {
  return '' + bla + always.returnNothing() + render.bar()
}