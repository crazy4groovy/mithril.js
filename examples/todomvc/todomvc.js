/* global m, requestAnimationFrame, localStorage */
'use strict';

(function () {
  var $ = m // like jQuery DOM creation!
  var nextTick = requestAnimationFrame

  var store = {}
  store = (function () {
    var model = {
      todos: JSON.parse(localStorage['todos-mithril'] || '[]'),
      todosByStatus: [],
      editing: null,
      editingIdx: -1,
      showing: '',
      remaining: 0
    }

    return {
      model: function getModel () { return JSON.parse(JSON.stringify(model)) },

      createTodo: function (title) {
        if (title) model.todos.push({ title: title.trim(), completed: false })
      },
      setStatuses: function (completed) {
        for (var i = 0; i < model.todos.length; i++) model.todos[i].completed = completed
      },
      toggleStatus: function (todoIdx) {
        model.todosByStatus[todoIdx].completed = !model.todosByStatus[todoIdx].completed
      },
      destroy: function (todoIdx) {
        var todo = model.todosByStatus[todoIdx]
        var index = model.todos.indexOf(todo)
        if (index > -1) model.todos.splice(index, 1)
      },
      clear: function () {
        var len = model.todos.length
        while (len--) {
          if (model.todos[len].completed) store.destroy(len)
        }
      },

      edit: function (todoIdx) {
        var todo = model.todosByStatus[todoIdx]
        model.editing = todo
        model.editingIdx = todoIdx
      },
      update: function (title) {
        if (model.editing != null) {
          model.editing.title = title.trim()
          if (model.editing.title === '') store.destroy(model.editingIdx)
          store.reset()
        }
      },
      reset: function () {
        model.editing = null
        model.editingIdx = -1
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
      },

      dispatch: function (action, args) {
        action.apply(store, args || [])
        nextTick(function () {
          localStorage['todos-mithril'] = JSON.stringify(model.todos)
        })
      }
    }
  })()

  // view ////////////////////////////////////

  var TodosComponent = {
    add: function (e) {
      if (e.keyCode === 13) {
        store.dispatch(store.createTodo, [e.target.value])
        e.target.value = ''
      }
    },
    toggleAll: function () {
      store.dispatch(store.setStatuses, [document.getElementById('toggle-all').checked])
    },
    focus: function (vnode, todoIdx, title) {
      if (
        todoIdx === store.model().editingIdx &&
        vnode.dom !== document.activeElement
      ) {
        vnode.dom.value = title
        vnode.dom.focus()
        vnode.dom.selectionStart = vnode.dom.selectionEnd = title.length
      }
    },
    save: function (e) {
      if (e.keyCode === 13 || e.type === 'blur') store.dispatch(store.update, [e.target.value])
      else if (e.keyCode === 27) store.dispatch(store.reset)
    },
    onDispatch: function (action, args) {
      return function () {
        store.dispatch(action, args)
      }
    },

    oninit: store.computeModel,
    onbeforeupdate: store.computeModel,

    view: function (vnode) {
      var ui = vnode.state
      var storeModel = store.model()

      return [
        $('header.header', [
          $('h1', 'todos'),
          $("input#new-todo[placeholder='What needs to be done?'][autofocus]", { onkeypress: ui.add })
        ]),

        $('section#main', { style: { display: storeModel.todos.length > 0 ? '' : 'none' } }, [
          $("input#toggle-all[type='checkbox']", { checked: storeModel.remaining === 0, onclick: ui.toggleAll }),
          $("label[for='toggle-all']", { onclick: ui.toggleAll }, 'Mark all as complete'),
          $('ul#todo-list', [
            storeModel.todosByStatus.map(function (todo, idx) {
              return $('li', { class: (todo.completed ? 'completed' : '') + ' ' + (idx === storeModel.editingIdx ? 'editing' : '') }, [
                $('div.view', [
                  $("input.toggle[type='checkbox']", { checked: todo.completed, onclick: ui.onDispatch(store.toggleStatus, [idx]) }),
                  $('label', { ondblclick: ui.onDispatch(store.edit, [idx]) },
                    todo.title),
                  $('button.destroy', { onclick: ui.onDispatch(store.destroy, [idx]) })
                ]),
                $('input.edit', { onupdate: function (vnode) { ui.focus(vnode, idx, todo.title) }, onkeypress: ui.save, onblur: ui.save })
              ])
            })
          ])
        ]),

        storeModel.todos.length
        ? $('footer#footer', [
          $('span#todo-count', [
            $('strong', storeModel.remaining),
            storeModel.remaining === 1 ? ' item left' : ' items left'
          ]),
          $('ul#filters', [
            $('li', $("a[href='/']", { oncreate: m.route.link, class: storeModel.showing === '' ? 'selected' : '' }, 'All')),
            $('li', $("a[href='/active']", { oncreate: m.route.link, class: storeModel.showing === 'active' ? 'selected' : '' }, 'Active')),
            $('li', $("a[href='/completed']", { oncreate: m.route.link, class: storeModel.showing === 'completed' ? 'selected' : '' }, 'Completed'))
          ]),
          $('button#clear-completed', { onclick: ui.onDispatch(store.clear) }, 'Clear completed')
        ])
        : null
      ]
    }
  }

  m.route(document.getElementById('todoapp'), '/', {
    '/': TodosComponent,
    '/:status': TodosComponent
  })
})()
