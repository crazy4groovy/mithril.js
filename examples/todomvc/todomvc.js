/* global m, requestAnimationFrame, localStorage */
'use strict';

(function () {
  var $ = m // like jQuery DOM creation!
  var nextTick = requestAnimationFrame

  var store = {}
  store = (function () {
    var model = {
      todos: JSON.parse(localStorage['todos-mithril'] || '[]'),
      editing: null,
      showing: '',
      remaining: 0,
      todosByStatus: []
    }

    return {
      model: {},

      createTodo: function (title) {
        model.todos.push({ title: title.trim(), completed: false })
      },
      setStatuses: function (completed) {
        for (var i = 0; i < model.todos.length; i++) model.todos[i].completed = completed
      },
      setStatus: function (todo, completed) {
        todo.completed = completed
      },
      destroy: function (todo) {
        var index = model.todos.indexOf(todo)
        if (index > -1) model.todos.splice(index, 1)
      },
      clear: function () {
        for (var i = 0; i < model.todos.length; i++) {
          if (model.todos[i].completed) store.destroy(model.todos[i--])
        }
      },

      edit: function (todo) {
        console.log('EDITING')
        model.editing = todo
      },
      update: function (title) {
        if (model.editing != null) {
          model.editing.title = title.trim()
          if (model.editing.title === '') store.destroy(model.editing)
          model.editing = null
        }
      },
      reset: function () {
        model.editing = null
      },

      computeModel: function (vnode) {
        model.showing = (vnode && vnode.attrs.status) || ''
        model.remaining = model.todos.filter(function (todo) { return !todo.completed }).length
        model.todosByStatus = model.todos.filter(function (todo) {
          switch (model.showing) {
            case '': return true
            case 'active': return !todo.completed
            case 'completed': return todo.completed
          }
        })

        // TODO: take a snapshot of the model, for the view
        store.model = model
      },

      dispatch: function (action, args) {
        action.apply(store, args || [])
        nextTick(function () {
          localStorage['todos-mithril'] = JSON.stringify(model.todos)
        })
      },
      onDispatch: function (action, args) {
        return function () {
          store.dispatch(action, args)
        }
      }
    }
  })()

  console.log(store)

  // view ////////////////////////////////////

  var Todos = {
    add: function (e) {
      if (e.keyCode === 13) {
        store.dispatch(store.createTodo, [e.target.value])
        e.target.value = ''
      }
    },
    toggleAll: function () {
      store.dispatch(store.setStatuses, [document.getElementById('toggle-all').checked])
    },
    toggle: function (todo) {
      store.dispatch(store.setStatus, [todo, !todo.completed])
    },
    focus: function (vnode, todo) {
      if (todo === store.model.editing && vnode.dom !== document.activeElement) {
        vnode.dom.value = todo.title
        vnode.dom.focus()
        vnode.dom.selectionStart = vnode.dom.selectionEnd = todo.title.length
      }
    },
    save: function (e) {
      if (e.keyCode === 13 || e.type === 'blur') store.dispatch(store.update, [e.target.value])
      else if (e.keyCode === 27) store.dispatch(store.reset)
    },

    oninit: store.computeModel,
    onbeforeupdate: store.computeModel,

    view: function (vnode) {
      var ui = vnode.state
      return [
        $('header.header', [
          $('h1', 'todos'),
          $("input#new-todo[placeholder='What needs to be done?'][autofocus]", { onkeypress: ui.add })
        ]),
        $('section#main', { style: { display: store.model.todos.length > 0 ? '' : 'none' } }, [
          $("input#toggle-all[type='checkbox']", { checked: store.model.remaining === 0, onclick: ui.toggleAll }),
          $("label[for='toggle-all']", { onclick: ui.toggleAll }, 'Mark all as complete'),
          $('ul#todo-list', [
            store.model.todosByStatus.map(function (todo) {
              return $('li', { class: (todo.completed ? 'completed' : '') + ' ' + (todo === store.model.editing ? 'editing' : '') }, [
                $('.view', [
                  $("input.toggle[type='checkbox']", { checked: todo.completed, onclick: function () { ui.toggle(todo) } }),
                  $('label', { ondblclick: store.onDispatch(store.edit, [todo]) }, todo.title),
                  $('button.destroy', { onclick: store.onDispatch(store.destroy, [todo]) })
                ]),
                $('input.edit', { onupdate: function (vnode) { ui.focus(vnode, todo) }, onkeypress: ui.save, onblur: ui.save })
              ])
            })
          ])
        ]),
        store.model.todos.length
        ? $('footer#footer', [
          $('span#todo-count', [
            $('strong', store.model.remaining),
            store.model.remaining === 1 ? ' item left' : ' items left'
          ]),
          $('ul#filters', [
            $('li', $("a[href='/']", { oncreate: m.route.link, class: store.model.showing === '' ? 'selected' : '' }, 'All')),
            $('li', $("a[href='/active']", { oncreate: m.route.link, class: store.model.showing === 'active' ? 'selected' : '' }, 'Active')),
            $('li', $("a[href='/completed']", { oncreate: m.route.link, class: store.model.showing === 'completed' ? 'selected' : '' }, 'Completed'))
          ]),
          $('button#clear-completed', { onclick: store.onDispatch(store.clear) }, 'Clear completed')
        ])
        : null
      ]
    }
  }

  m.route(document.getElementById('todoapp'), '/', {
    '/': Todos,
    '/:status': Todos
  })
})()
