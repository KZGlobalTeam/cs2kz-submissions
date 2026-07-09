import withNuxt from './.nuxt/eslint.config.mjs'

if (!Object.groupBy) {
  Object.groupBy = (items, callback) =>
    items.reduce((groups, item, index) => {
      const key = callback(item, index)
      groups[key] ??= []
      groups[key].push(item)
      return groups
    }, {})
}

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
  },
})
