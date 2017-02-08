/* global requestAnimationFrame, localStorage, m, destroy */

var $ = m

// model

var state = {
  dispatch: function (action, args) {
    state[action].apply(state, args || [])
    requestAnimationFrame(function () {
      localStorage['todos-mithril'] = JSON.stringify(state.todos)
    })
  },

  todos: JSON.parse(localStorage['todos-mithril'] || '[]'),
  editing: null,
  filter: '',
  remaining: 0,
  todosByStatus: [],

  createTodo: function (title) {
    state.todos.push({ title: title.trim(), completed: false })
  },
  setStatuses: function (completed) {
    for (var i = 0; i < state.todos.length; i++) state.todos[i].completed = completed
  },
  setStatus: function (todo, completed) {
    todo.completed = completed
  },
  destroy: function (todo) {
    var index = state.todos.indexOf(todo)
    if (index > -1) state.todos.splice(index, 1)
  },
  clear: function () {
    for (var i = 0; i < state.todos.length; i++) {
      if (state.todos[i].completed) state.destroy(state.todos[i--])
    }
  },

  edit: function (todo) {
    state.editing = todo
  },
  update: function (title) {
    if (state.editing != null) {
      state.editing.title = title.trim()
      if (state.editing.title === '') destroy(state.editing)
      state.editing = null
    }
  },
  reset: function () {
    state.editing = null
  },

  computed: function (vnode) {
    state.showing = vnode.attrs.status || ''
    state.remaining = state.todos.filter(function (todo) { return !todo.completed }).length
    state.todosByStatus = state.todos.filter(function (todo) {
      switch (state.showing) {
        case '': return true
        case 'active': return !todo.completed
        case 'completed': return todo.completed
      }
    })
  }
}

// view
var Todos = {
  add: function (e) {
    if (e.keyCode === 13) {
      state.dispatch('createTodo', [e.target.value])
      e.target.value = ''
    }
  },
  toggleAll: function () {
    state.dispatch('setStatuses', [document.getElementById('toggle-all').checked])
  },
  toggle: function (todo) {
    state.dispatch('setStatus', [todo, !todo.completed])
  },
  focus: function (vnode, todo) {
    if (todo === state.editing && vnode.dom !== document.activeElement) {
      vnode.dom.value = todo.title
      vnode.dom.focus()
      vnode.dom.selectionStart = vnode.dom.selectionEnd = todo.title.length
    }
  },
  save: function (e) {
    if (e.keyCode === 13 || e.type === 'blur') state.dispatch('update', [e.target.value])
    else if (e.keyCode === 27) state.dispatch('reset')
  },
  oninit: state.computed,
  onbeforeupdate: state.computed,
  view: function (vnode) {
    var ui = vnode.state
    return [
      $('header.header', [
        $('h1', 'todos'),
        $("input#new-todo[placeholder='What needs to be done?'][autofocus]", { onkeypress: ui.add })
      ]),
      $('section#main', { style: { display: state.todos.length > 0 ? '' : 'none' } }, [
        $("input#toggle-all[type='checkbox']", { checked: state.remaining === 0, onclick: ui.toggleAll }),
        $("label[for='toggle-all']", { onclick: ui.toggleAll }, 'Mark all as complete'),
        $('ul#todo-list', [
          state.todosByStatus.map(function (todo) {
            return $('li', { class: (todo.completed ? 'completed' : '') + ' ' + (todo === state.editing ? 'editing' : '') }, [
              $('.view', [
                $("input.toggle[type='checkbox']", { checked: todo.completed, onclick: function () { ui.toggle(todo) } }),
                $('label', { ondblclick: function () { state.dispatch('edit', [todo]) } }, todo.title),
                $('button.destroy', { onclick: function () { state.dispatch('destroy', [todo]) } })
              ]),
              $('input.edit', { onupdate: function (vnode) { ui.focus(vnode, todo) }, onkeypress: ui.save, onblur: ui.save })
            ])
          })
        ])
      ]),
      state.todos.length ? $('footer#footer', [
        $('span#todo-count', [
          $('strong', state.remaining),
          state.remaining === 1 ? ' item left' : ' items left'
        ]),
        $('ul#filters', [
          $('li', $("a[href='/']", { oncreate: m.route.link, class: state.showing === '' ? 'selected' : '' }, 'All')),
          $('li', $("a[href='/active']", { oncreate: m.route.link, class: state.showing === 'active' ? 'selected' : '' }, 'Active')),
          $('li', $("a[href='/completed']", { oncreate: m.route.link, class: state.showing === 'completed' ? 'selected' : '' }, 'Completed'))
        ]),
        $('button#clear-completed', { onclick: function () { state.dispatch('clear') } }, 'Clear completed')
      ]) : null
    ]
  }
}

m.route(document.getElementById('todoapp'), '/', {
  '/': Todos,
  '/:status': Todos
})
