const COMPONENT_NAME = /^[A-Z](?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]*$/
const HOOK_NAME = /^use[A-Z]/
const CLIENT_DIRECTIVE = 'use client'

const isAllowedName = (name) => COMPONENT_NAME.test(name) || HOOK_NAME.test(name)

const hasClientDirective = (program) => {
  const first = program.body[0]
  return first?.type === 'ExpressionStatement' && first.directive === CLIENT_DIRECTIVE
}

const collectPatternNodes = (pattern) => {
  if (pattern.type === 'Identifier') {
    return [pattern]
  }
  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.flatMap((element) => (element ? collectPatternNodes(element) : []))
  }
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.flatMap((property) =>
      collectPatternNodes(property.type === 'RestElement' ? property.argument : property.value),
    )
  }
  if (pattern.type === 'AssignmentPattern') {
    return collectPatternNodes(pattern.left)
  }
  if (pattern.type === 'RestElement') {
    return collectPatternNodes(pattern.argument)
  }
  return []
}

const getDeclaredNodes = (declaration) => {
  if (!declaration) {
    return []
  }
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.flatMap((declarator) => collectPatternNodes(declarator.id))
  }
  if (
    (declaration.type === 'FunctionDeclaration' ||
      declaration.type === 'ClassDeclaration' ||
      declaration.type === 'TSEnumDeclaration') &&
    declaration.id
  ) {
    return [declaration.id]
  }
  return []
}

const getSpecifierName = (specifier) =>
  specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value

export const clientModuleExports = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      nonComponentExport:
        "'use client' modules may export only components and hooks; move {{name}} to a server-safe module.",
      exportAll: "'use client' modules must not use export *; export components and hooks by name.",
    },
  },
  create: (context) => {
    if (!hasClientDirective(context.sourceCode.ast)) {
      return {}
    }
    return {
      ExportNamedDeclaration: (node) => {
        if (node.exportKind === 'type') {
          return
        }
        for (const identifier of getDeclaredNodes(node.declaration)) {
          if (!isAllowedName(identifier.name)) {
            context.report({
              node: identifier,
              messageId: 'nonComponentExport',
              data: { name: identifier.name },
            })
          }
        }
        for (const specifier of node.specifiers) {
          if (specifier.exportKind === 'type') {
            continue
          }
          const name = getSpecifierName(specifier)
          if (name !== 'default' && !isAllowedName(name)) {
            context.report({ node: specifier, messageId: 'nonComponentExport', data: { name } })
          }
        }
      },
      ExportAllDeclaration: (node) => {
        if (node.exportKind === 'type') {
          return
        }
        context.report({ node, messageId: 'exportAll' })
      },
    }
  },
}
