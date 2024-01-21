import explicitMemberAccessibility, {
  ExplicitMemberAccessibilityMessageIds,
  ExplicitMemberAccessibilityOption
} from '../../src/rules/explicit-member-accessibility';
import { testRun, testEntity as originTestEntity } from '../utils';

const template = `class TestCase {
  {data}
}`;

const testEntity = originTestEntity<
  ExplicitMemberAccessibilityMessageIds,
  ExplicitMemberAccessibilityOption
>(template) as any;

const AllAllowAccessibility = ['public', 'protected', 'private'];
const NoPublicAllowAccessibility = ['protected', 'private'];

const parameterCases = [];

const feildCases = ['feild:number = 0', 'feild?:number', 'method:()=>{}'];

const accessorCases = ['get accessor(){}', 'set accessor(){}'];

const methodCases = ['method(){}'];

const memberCases = [...accessorCases, ...methodCases];

const allCases = [...feildCases, ...memberCases];

testRun(explicitMemberAccessibility.name, explicitMemberAccessibility.rule, {
  valid: [
    //#region default

    // static
    allCases.map(v => testEntity(`static ${v}`)),

    // constructors
    testEntity('constructor(){}'),
    NoPublicAllowAccessibility.map(k => testEntity(`${k} constructor(){}`)),

    // parameterProperties
    testEntity('constructor(a: string){}'),
    AllAllowAccessibility.map(k =>
      testEntity(`constructor(${k} readonly a: string){}`)
    ),

    // properties
    AllAllowAccessibility.map(k =>
      feildCases.map(c => testEntity(`${k} ${c}`))
    ),

    // methods
    AllAllowAccessibility.map(k =>
      memberCases.map(c => testEntity(`${k} ${c}`))
    ),

    //#endregion

    //#region static off

    // static
    AllAllowAccessibility.map(k =>
      memberCases.map(c =>
        testEntity(`${k} static ${c}`, { staticAccessibility: 'off' })
      )
    ),

    // constructors
    testEntity('constructor(){}', { staticAccessibility: 'off' }),
    NoPublicAllowAccessibility.map(k =>
      testEntity(`${k} constructor(){}`, { staticAccessibility: 'off' })
    ),

    // parameterProperties
    testEntity('constructor(a: string){}', { staticAccessibility: 'off' }),
    AllAllowAccessibility.map(k =>
      testEntity(`constructor(${k} readonly a: string){}`)
    ),

    // properties
    AllAllowAccessibility.map(k =>
      feildCases.map(c =>
        testEntity(`${k} ${c}`, { staticAccessibility: 'off' })
      )
    ),

    // methods
    AllAllowAccessibility.map(k =>
      memberCases.map(c =>
        testEntity(`${k} ${c}`, { staticAccessibility: 'off' })
      )
    ),

    //#endregion

    //#region off

    // static
    allCases.map(v => testEntity(`static ${v}`, { accessibility: 'off' })),

    // constructors
    testEntity('constructor(){}', { accessibility: 'off' }),
    AllAllowAccessibility.map(k =>
      testEntity(`${k} constructor(){}`, { accessibility: 'off' })
    ),

    // parameterProperties
    testEntity('constructor(a: string){}'),
    AllAllowAccessibility.map(k =>
      testEntity(`constructor(${k} readonly a: string){}`, {
        accessibility: 'off'
      })
    ),

    // properties & accessor & method
    allCases.map(c => testEntity(`${c}`, { accessibility: 'off' })),
    AllAllowAccessibility.map(k =>
      allCases.map(c => testEntity(`${k} ${c}`, { accessibility: 'off' }))
    ),

    //#endregion

    //#region fixWith public

    // static
    allCases.map(v =>
      testEntity(`static ${v}`, {
        accessibility: 'explicit',
        staticAccessibility: 'no-accessibility',
        fixWith: 'public'
      })
    ),

    // parameterProperties
    testEntity('constructor(a: string){}'),
    testEntity(`constructor(public readonly a: string){}`, {
      accessibility: 'explicit',
      staticAccessibility: 'no-accessibility',
      fixWith: 'public'
    }),

    // properties
    feildCases.map(c =>
      testEntity(`public ${c}`, {
        accessibility: 'explicit',
        staticAccessibility: 'no-accessibility',
        fixWith: 'public'
      })
    ),

    // methods
    memberCases.map(c =>
      testEntity(`public ${c}`, {
        accessibility: 'explicit',
        staticAccessibility: 'no-accessibility',
        fixWith: 'public'
      })
    )

    //#endregion
  ],
  invalid: [
    //#region default

    // static
    AllAllowAccessibility.map(k =>
      memberCases.map(c =>
        testEntity(
          `${k} static ${c}`,
          null,
          'missingAccessibility',
          `static ${c}`
        )
      )
    ),

    // constructors
    testEntity(
      'public constructor(){}',
      null,
      'missingAccessibility',
      'constructor(){}'
    ),

    // parameterProperties
    testEntity(
      'constructor(readonly a: string){}',
      null,
      'unwantedPublicAccessibility',
      'constructor(protected readonly a: string){}'
    ),

    // properties & accessor & method
    allCases.map(c =>
      testEntity(c, null, 'unwantedPublicAccessibility', `protected ${c}`)
    ),

    //#endregion

    //#region static off

    // constructors
    testEntity(
      `public constructor(){}`,
      { staticAccessibility: 'off' },
      'missingAccessibility',
      'constructor(){}'
    ),

    // parameterProperties
    testEntity(
      'constructor(readonly a: string){}',
      { staticAccessibility: 'off' },
      'unwantedPublicAccessibility',
      'constructor(protected readonly a: string){}'
    ),

    // properties & accessor & method
    allCases.map(c =>
      testEntity(
        c,
        { staticAccessibility: 'off' },
        'unwantedPublicAccessibility',
        `protected ${c}`
      )
    ),

    //#endregion

    //#region off

    // static
    AllAllowAccessibility.map(k =>
      memberCases.map(c =>
        testEntity(
          `${k} static ${c}`,
          { accessibility: 'off' },
          'missingAccessibility',
          `static ${c}`
        )
      )
    ),

    //#endregion

    //#region fixWith public

    // static
    AllAllowAccessibility.map(k =>
      memberCases.map(c =>
        testEntity(
          `${k} static ${c}`,
          {
            accessibility: 'explicit',
            staticAccessibility: 'no-accessibility',
            fixWith: 'public'
          },
          'missingAccessibility',
          `static ${c}`
        )
      )
    ),

    // constructors

    testEntity(
      `public constructor(){}`,
      {
        accessibility: 'explicit',
        staticAccessibility: 'no-accessibility',
        fixWith: 'public'
      },
      'missingAccessibility',
      'constructor(){}'
    ),

    // parameterProperties
    testEntity(
      'constructor(readonly a: string){}',
      {
        accessibility: 'explicit',
        staticAccessibility: 'no-accessibility',
        fixWith: 'public'
      },
      'unwantedPublicAccessibility',
      'constructor(public readonly a: string){}'
    ),

    // properties & accessor & method
    allCases.map(c =>
      testEntity(
        c,
        {
          accessibility: 'explicit',
          staticAccessibility: 'no-accessibility',
          fixWith: 'public'
        },
        'unwantedPublicAccessibility',
        `public ${c}`
      )
    )

    //#endregion
  ]
});
