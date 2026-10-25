import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'vitest'

import { clientModuleExports } from './client-module-exports.mjs'

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
})

const CLIENT = "'use client'\n"

ruleTester.run('client-module-exports', clientModuleExports, {
  valid: [
    {
      name: 'Given a client module exporting a component, should accept it',
      code: `${CLIENT}export const Dialog = () => null`,
    },
    {
      name: 'Given a client module exporting a hook, should accept it',
      code: `${CLIENT}export const useToggle = () => true`,
    },
    {
      name: 'Given a client module re-aliasing a primitive, should accept it',
      code: `${CLIENT}export const Dialog = Primitive.Root`,
    },
    {
      name: 'Given a client module exporting types, should accept them',
      code: `${CLIENT}export type Mode = 'a' | 'b'\nexport interface Props { a: string }\nexport type { Other } from './other'\nexport { type Third }`,
    },
    {
      name: 'Given a client module with a default export, should accept it',
      code: `${CLIENT}const Page = () => null\nexport default Page`,
    },
    {
      name: 'Given a module without the directive exporting a constant, should accept it',
      code: 'export const MAX_ITEMS = 3',
    },
    {
      name: 'Given a module without the directive exporting ACCOUNT_SECTIONS, should accept it',
      code: "export const ACCOUNT_SECTIONS = ['security', 'ai'] as const",
    },
  ],
  invalid: [
    {
      name: 'Given a client module exporting ACCOUNT_SECTIONS, should report it',
      code: `${CLIENT}export const ACCOUNT_SECTIONS = ['security'] as const`,
      errors: [{ messageId: 'nonComponentExport', data: { name: 'ACCOUNT_SECTIONS' } }],
    },
    {
      name: 'Given a client module exporting a camelCase function, should report it',
      code: `${CLIENT}export const toSection = (value) => value`,
      errors: [{ messageId: 'nonComponentExport', data: { name: 'toSection' } }],
    },
    {
      name: 'Given a client module exporting a function declaration helper, should report it',
      code: `${CLIENT}export function helper() { return 1 }`,
      errors: [{ messageId: 'nonComponentExport', data: { name: 'helper' } }],
    },
    {
      name: 'Given a client module exporting an all-caps constant MAX, should report it',
      code: `${CLIENT}export const MAX = 3`,
      errors: [{ messageId: 'nonComponentExport', data: { name: 'MAX' } }],
    },
    {
      name: 'Given a client module exporting a destructured value, should report it',
      code: `${CLIENT}export const { first, Second } = source`,
      errors: [{ messageId: 'nonComponentExport', data: { name: 'first' } }],
    },
    {
      name: 'Given a client module with an export list, should report the non-component',
      code: `${CLIENT}const helper = 1\nexport { helper }`,
      errors: [{ messageId: 'nonComponentExport', data: { name: 'helper' } }],
    },
    {
      name: 'Given a client module aliasing an export to a non-component name, should report the alias',
      code: `${CLIENT}const Thing = () => null\nexport { Thing as thing }`,
      errors: [{ messageId: 'nonComponentExport', data: { name: 'thing' } }],
    },
    {
      name: 'Given a client module using export all, should report it',
      code: `${CLIENT}export * from './other'`,
      errors: [{ messageId: 'exportAll' }],
    },
  ],
})
