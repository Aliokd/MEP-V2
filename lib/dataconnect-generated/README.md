# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `mep-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*getUserConstellation*](#getuserconstellation)
  - [*getLessonDetails*](#getlessondetails)
- [**Mutations**](#mutations)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `mep-connector`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@mep/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@mep/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@mep/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `mep-connector` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## getUserConstellation
You can execute the `getUserConstellation` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserConstellation(vars: GetUserConstellationVariables): QueryPromise<GetUserConstellationData, GetUserConstellationVariables>;

interface GetUserConstellationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserConstellationVariables): QueryRef<GetUserConstellationData, GetUserConstellationVariables>;
}
export const getUserConstellationRef: GetUserConstellationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserConstellation(dc: DataConnect, vars: GetUserConstellationVariables): QueryPromise<GetUserConstellationData, GetUserConstellationVariables>;

interface GetUserConstellationRef {
  ...
  (dc: DataConnect, vars: GetUserConstellationVariables): QueryRef<GetUserConstellationData, GetUserConstellationVariables>;
}
export const getUserConstellationRef: GetUserConstellationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserConstellationRef:
```typescript
const name = getUserConstellationRef.operationName;
console.log(name);
```

### Variables
The `getUserConstellation` query requires an argument of type `GetUserConstellationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserConstellationVariables {
  uid: string;
}
```
### Return Type
Recall that executing the `getUserConstellation` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserConstellationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserConstellationData {
  user?: {
    id: string;
    displayName?: string | null;
    lessonProgress: ({
      lessonId: UUIDString;
      status: ProgressStatus;
      accuracyScore?: number | null;
    })[];
  } & User_Key;
    lessonsList: ({
      id: UUIDString;
      title: string;
      movementId: UUIDString;
      order: number;
      durationSeconds: number;
      prerequisites: ({
        prerequisiteId: UUIDString;
      })[];
    } & Lesson_Key)[];
      movements: ({
        id: UUIDString;
        title: string;
        order: number;
      } & Movement_Key)[];
}
```
### Using `getUserConstellation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserConstellation, GetUserConstellationVariables } from '@mep/dataconnect';

// The `getUserConstellation` query requires an argument of type `GetUserConstellationVariables`:
const getUserConstellationVars: GetUserConstellationVariables = {
  uid: ..., 
};

// Call the `getUserConstellation()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserConstellation(getUserConstellationVars);
// Variables can be defined inline as well.
const { data } = await getUserConstellation({ uid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserConstellation(dataConnect, getUserConstellationVars);

console.log(data.user);
console.log(data.lessonsList);
console.log(data.movements);

// Or, you can use the `Promise` API.
getUserConstellation(getUserConstellationVars).then((response) => {
  const data = response.data;
  console.log(data.user);
  console.log(data.lessonsList);
  console.log(data.movements);
});
```

### Using `getUserConstellation`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserConstellationRef, GetUserConstellationVariables } from '@mep/dataconnect';

// The `getUserConstellation` query requires an argument of type `GetUserConstellationVariables`:
const getUserConstellationVars: GetUserConstellationVariables = {
  uid: ..., 
};

// Call the `getUserConstellationRef()` function to get a reference to the query.
const ref = getUserConstellationRef(getUserConstellationVars);
// Variables can be defined inline as well.
const ref = getUserConstellationRef({ uid: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserConstellationRef(dataConnect, getUserConstellationVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);
console.log(data.lessonsList);
console.log(data.movements);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
  console.log(data.lessonsList);
  console.log(data.movements);
});
```

## getLessonDetails
You can execute the `getLessonDetails` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getLessonDetails(vars: GetLessonDetailsVariables): QueryPromise<GetLessonDetailsData, GetLessonDetailsVariables>;

interface GetLessonDetailsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLessonDetailsVariables): QueryRef<GetLessonDetailsData, GetLessonDetailsVariables>;
}
export const getLessonDetailsRef: GetLessonDetailsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getLessonDetails(dc: DataConnect, vars: GetLessonDetailsVariables): QueryPromise<GetLessonDetailsData, GetLessonDetailsVariables>;

interface GetLessonDetailsRef {
  ...
  (dc: DataConnect, vars: GetLessonDetailsVariables): QueryRef<GetLessonDetailsData, GetLessonDetailsVariables>;
}
export const getLessonDetailsRef: GetLessonDetailsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getLessonDetailsRef:
```typescript
const name = getLessonDetailsRef.operationName;
console.log(name);
```

### Variables
The `getLessonDetails` query requires an argument of type `GetLessonDetailsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetLessonDetailsVariables {
  lessonId: UUIDString;
}
```
### Return Type
Recall that executing the `getLessonDetails` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetLessonDetailsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetLessonDetailsData {
  lesson?: {
    id: UUIDString;
    title: string;
    videoUrl: string;
    midiDataUrl?: string | null;
    durationSeconds: number;
    movement: {
      title: string;
    };
      prerequisites: ({
        prerequisite: {
          id: UUIDString;
          title: string;
        } & Lesson_Key;
      })[];
  } & Lesson_Key;
}
```
### Using `getLessonDetails`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getLessonDetails, GetLessonDetailsVariables } from '@mep/dataconnect';

// The `getLessonDetails` query requires an argument of type `GetLessonDetailsVariables`:
const getLessonDetailsVars: GetLessonDetailsVariables = {
  lessonId: ..., 
};

// Call the `getLessonDetails()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getLessonDetails(getLessonDetailsVars);
// Variables can be defined inline as well.
const { data } = await getLessonDetails({ lessonId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getLessonDetails(dataConnect, getLessonDetailsVars);

console.log(data.lesson);

// Or, you can use the `Promise` API.
getLessonDetails(getLessonDetailsVars).then((response) => {
  const data = response.data;
  console.log(data.lesson);
});
```

### Using `getLessonDetails`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getLessonDetailsRef, GetLessonDetailsVariables } from '@mep/dataconnect';

// The `getLessonDetails` query requires an argument of type `GetLessonDetailsVariables`:
const getLessonDetailsVars: GetLessonDetailsVariables = {
  lessonId: ..., 
};

// Call the `getLessonDetailsRef()` function to get a reference to the query.
const ref = getLessonDetailsRef(getLessonDetailsVars);
// Variables can be defined inline as well.
const ref = getLessonDetailsRef({ lessonId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getLessonDetailsRef(dataConnect, getLessonDetailsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.lesson);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.lesson);
});
```

# Mutations

No mutations were generated for the `mep-connector` connector.

If you want to learn more about how to use mutations in Data Connect, you can follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

