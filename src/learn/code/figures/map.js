// Code-tab figures for map.h: the same red-black tree pictures as set.h (rbFigures), plus operator[] and at.
import { rbFigures } from './set.js';

const tag = (text) => (frame) => ({ ...frame, msg: `${text}: ${frame.msg}` });

export default {
  ...rbFigures({ map: true, arg: (k, v = 0) => ({ k, v }), members: { root: 'root', size: 'node_count', inorder: 'inorder (k:v)' } }),
  subscript: {
    frames: (ctx) => [
      ...ctx.run('operator[]', { k: 30, v: 99 }).map(tag('m[30] = 99')),
      ...ctx.run('operator[]', { k: 80, v: 64 }).map(tag('m[80] = 64')),
    ],
  },
  at: {
    frames: (ctx) => [
      ...ctx.run('at', { k: 30 }).map(tag('m.at(30)')),
      ...ctx.run('at', { k: 35 }).map(tag('m.at(35)')),
    ],
  },
};
