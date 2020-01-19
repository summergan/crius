import { run } from "crius-runner";
import { Props, Context, StepType } from "crius";
import { isCriusFlow } from 'crius-is';
import { Step, BaseContext } from "./step";
import { parserString, compileString } from "./utils";


function autorun(_test: Function) {
  return function(_target: Object) {
    const target = (isCriusFlow(_target) ? () => target : _target) as typeof Step;
    // TODO support callback(assert) for tape and ava: (t) => {}
    if (typeof target.examples === "undefined" || target.examples === null) {
      target.examples = [{}];
    }
    const testParams =
      typeof target.handleParams === "function"
        ? target.handleParams(target.examples)
        : target.examples;
    for (const example of testParams) {
      let title = compileString(target.title || "", example);
      // if(target.meta !== null) {
      //   title = JSON.stringify({title, ...target.meta, level:target.level});
      // }
      let tags: any[] = [];
      typeof target.salesforce !== "undefined" ? tags.push(target.salesforce): tags.push();
      typeof target.google !== "undefined" ? tags.push(target.google): tags.push();

      let brands: any[] = [];
      typeof target.rc !== "undefined" ? brands.push(target.rc): brands.push();
      typeof target.bt !== "undefined" ? brands.push(target.bt): brands.push();
      let metadata: object;
      if(tags.length > 0) {
        metadata = {tags}
      }
      if(brands.length > 0) {
        metadata = {...metadata, brands}
      }
      if(target.meta !== null) {
        metadata = {...metadata, ...target.meta}
        // title = JSON.stringify({title, ...target.meta, level:target.level});
      }
      if(target.level !== null) {
        metadata = {...metadata, level:target.level}
      }
      if( metadata !== null) {
        title = JSON.stringify({title, ...metadata})
      }

      // if(target.salesforce !== null) {
      //   tags.push(target.salesforce);
      // }
      // if(target.google !== null) {
      //   tags.push(target.google);
      // }
      console.log("title--", title);
      const baseContext: BaseContext = {
        title,
        example,
        async beforeEach(props, context, step) {
          if (typeof target.beforeEach === "function") {
            await target.beforeEach(props, context, step);
          }
          if (target.plugins) {
            for (const plugin of target.plugins) {
              if (typeof plugin.beforeEach === "function") {
                await plugin.beforeEach(props, context, step);
              }
            }
          }
        },
        async afterEach(props, context, step) {
          if (target.plugins) {
            for (const plugin of [...target.plugins].reverse()) {
              if (typeof plugin.afterEach === "function") {
                await plugin.afterEach(props, context, step);
              }
            }
          }
          if (typeof target.afterEach === "function") {
            await target.afterEach(props, context, step);
          }
        }
      };
      Object.defineProperties(
        baseContext,
        Object.getOwnPropertyDescriptors(target.context || {})
      );
      _test(title, async () => {
        await run(
          {
            key: target.name,
            props: { children: [] },
            step: target
          },
          baseContext
        );
      });
    }
  };
}

function title(title: string ) {
  if (typeof title === "undefined" || title === null) {
    throw new Error("Test case title is required.");
  }
  return function(target: Object) {
    (target as typeof Step).title = title;
  };
}

function meta(params: object) {
  return function(target: Object){
    (target as typeof Step).meta = params;
  }
}

function p0(target: object){
  (target as typeof Step).level=["p0"];
}

function p1(target: object){
  (target as typeof Step).level=["p1"];
}

function salesforce(params?: object){
  return function(target: object){
    const tag:any[] = typeof params !== "undefined"? ["salesforce", params]:["salesforce"];
    (target as typeof Step).salesforce = tag;
  }
}

function google(){
  return function(target: object){
    (target as typeof Step).google = ["google"];
  }
}

function rc(params?: object){
  return function(target: object){
    const tag:any[] = typeof params === 'object'? ["rc", params]:["rc"];
    (target as typeof Step).rc = tag;
  }
}

function bt(params?: object){
  return function(target: object){
    const tag:any[] = typeof params === 'object'? ["bt", params]:["bt"];
    (target as typeof Step).bt = tag;
  }
}


function examples(params: TemplateStringsArray | object[] | string | string[]) {
  return function(
    target: Object,
    name: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    if (Array.isArray(params)) {
      if (typeof params[0] === "string") {
        (target.constructor as typeof Step).examples = parserString(
          params[0] as string
        );
      } else if (toString.call(params[0]) === "[object Object]") {
        (target.constructor as typeof Step).examples = params as object[];
      } else {
        throw new Error(
          '"@examples" argument error, it must be an object or a string.'
        );
      }
    } else if (typeof params === "string") {
      (target.constructor as typeof Step).examples = parserString(params);
    } else {
      throw new Error(
        '"@examples" argument error, it must be an object or a string.'
      );
    }
    return descriptor;
  };
}

type HookCallback<P, C> = (
  props: Props<P, C>,
  context: Context<P, C>,
  step: StepType<P, C>
) => void;

function beforeEach<P = {}, C = {}>(hookCallback: HookCallback<P, C>) {
  if (typeof hookCallback !== "function") {
    throw new Error('"@beforeEach" argument error, it must be a function.');
  }
  return function(target: typeof Step) {
    target.beforeEach = hookCallback;
  };
}

function afterEach<P = {}, C = {}>(hookCallback: HookCallback<P, C>) {
  if (typeof hookCallback !== "function") {
    throw new Error('"@afterEach" argument error, it must be a function.');
  }
  return function(target: typeof Step) {
    target.afterEach = hookCallback;
  };
}

export type Plugins<P = {}, C = {}> = {
  beforeEach?: HookCallback<P, C>;
  afterEach?: HookCallback<P, C>;
};

function plugins<P = {}, C = {}>(plugins: Array<Plugins<P, C>>) {
  return function(target: typeof Step) {
    target.plugins = plugins;
  };
}

function params(handleParams: (testParams: any[]) => any[]) {
  if (typeof handleParams !== "function") {
    throw new Error('"@params" argument error, it must be a function.');
  }
  return function(target: Object) {
    (target as typeof Step).handleParams = handleParams;
  };
}

export { autorun, title, examples, beforeEach, afterEach, plugins, params, meta, p0, p1, salesforce, google, rc, bt };