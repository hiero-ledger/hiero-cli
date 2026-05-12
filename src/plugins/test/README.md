# Custom Plugin test

This is a quick explanation of custom plugin structure and step-by-step guide on how to create your own custom plugin.

## 🏗️ Architecture

This plugin follows the plugin architecture principles:

- **Stateless**: Plugin is functionally stateless
- **Dependency Injection**: Services are injected into command handlers
- **Manifest-Driven**: Capabilities declared via manifest with output specifications
- **Type Safety**: Full TypeScript support
- **Structured Output**: All command handlers return `CommandExecutionResult` with standardized output

## 📁 Structure

To showcase how the structure of the new plugin should like I will take the test plugin structure and add description what specific file contain

```
src/plugins/test/
├── manifest.ts              # Main file for registering plugin information, that holds information about commands, commands' options, namespace that plugin will use
├── schema.ts (optional)     # Optional schema with Zod validation, when declaring namespace for the plugin you can define zod types in here
├── commands/                # Inside the commands we would register command. Each command should be put inside separate directory.
│   ├── foo/                 # Foo test command - basic plugin that prints message to the output
│   │   ├── handler.ts       # Handler should hold of implemention logic the command would perform and use core services to achieve that
│   │   ├── input.ts         # Input schema and template are defined here for the command data input and validation
│   │   ├── output.ts        # Output schema and template are defined here
│   │   └── index.ts         # Command exports
│   ├── memo/                # Memo command that creates simple memo for an account present in the state
│   │   ├── handler.ts       # Handler should hold of implemention logic the command would perform and use Core Services to be able to do it
│   │   ├── input.ts         # Input schema and template are defined here for the command data input and validation
│   │   ├── output.ts        # Output schema and template are defined here
│   │   └── index.ts         # Command exports
├── schemas.ts (optional)    # Optional schemas file for handling data model for state introduced by plugin. If no new namespace is introduced by the plugin it is not needed
├── zustand-state-helper.ts (optional)  # Optional state management helper - we would create state helper if we would create our own namespace and need to handle state persistence for our new data models.
└── index.ts                # Plugin exports
```

### Manifest file

Manifest file is used to declare plugin's information, commands and schemas that will be used by it. Let me describe what needs to be defined in manifest by taking `manifest.ts` file located in this directory.

```ts
export const testPluginManifest: PluginManifest = {
  name: 'test', // name of the plugin that you want to register, mandatory field
  version: '1.0.0', // version of the plugin, mandatory field
  displayName: 'Test Plugin', // for displaying plugin's name, mandatory field
  description: 'For integration plugin', // brief description of what plugin capabilities, mandatory field
  capabilities: ['test:read', 'memo:create'], // set of capabilites, can be empty
  commands: [
    // definitions of commands
    {
      name: 'foo', // name of the command, mandatory field
      summary: 'Foo Test', // brief summary for the command, mandatory field
      description:
        'Does nothing, integration test only for plugin registration', // brief desciption of command, mandatory field
      options: [
        // options to use in command execution. Here we have set message option which we want to print. Can be empty if you do not want to specify any options for command's exection
        {
          name: 'message', // name of the option
          short: 'm', // short name of the option
          type: 'string', // type of the given option, can take values 'string', 'number', 'boolean' or 'array'
          required: true, // requirement of the option
          description: 'Message to print. Max size should be 100 characters', // description, when printing with help it is displayed. Mandatory field
        },
      ],
      handler: testFoo, // Handler implementation that we want to use when executing command. Needs to be set up
      output: {
        schema: TestFooOutputSchema, // zod schema to be parsed at the output
        humanTemplate: TEST_FOO_TEMPLATE, // human readable template to be printed at the output
      },
    },
    {
      name: 'memo',
      summary: 'Memo create ',
      description:
        'Add simple memo for account present in store. One for an account',
      options: [
        {
          name: 'account',
          short: 'a',
          type: 'string',
          required: true,
          description: 'Account alias present in state',
        },
        {
          name: 'memo',
          short: 'm',
          type: 'string',
          required: true,
          description: 'Memo for an account. Max size should be 100 characters',
        },
      ],
      handler: testMemo,
      output: {
        schema: TestMemoOutputSchema,
        humanTemplate: TEST_MEMO_TEMPLATE,
      },
    },
  ],
  stateSchemas: [
    // stateSchemas can be optional if your plugin do not introduce new state and only use core services. If you want create to store new information in the store you need to specify new namespace and jsonSchema,
    // the rest of the fields can have the defaults as specified below
    {
      namespace: MEMO_NAMESPACE, // unique name for a new file storage
      version: 1,
      jsonSchema: MEMO_JSON_SCHEMA,
      scope: 'profile',
    },
  ],
};

export default testPluginManifest;
```

To see basic implementation of the custom plugin browse `src/plugins/test` directory and see our custom implementation for basic plugins.

## 🚀 Plugin registration and execution

To register new plugin you need to follow these steps:

1. First of all build your plugin. If the plugin in the repository, please execute

```bash
npm run build
```

2. When your new plugin is built you need to register it with `plugin-management` plugin. Please execute these commands

```bash
hcli plugin-management add --path <path_to_your_manifest_file>
```

For default plugins (e.g. account, token), you can use `hcli plugin-management add --name account` instead of `--path`.

For example for adding this `test` plugin that its already built this command will look like this:

```bash
hcli plugin-management add --path dist/plugins/test/
```

Verify the plugin registration by executing:

```bash
hcli --help
```

If the plugin is present in the list then this means it is ready for usage.

If its not present on the list please verify that it is enabled and present in the state with command:

```bash
hcli plugin-management list
```
