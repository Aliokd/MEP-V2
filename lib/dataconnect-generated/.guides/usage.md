# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getUserConstellation, getLessonDetails } from '@mep/dataconnect';


// Operation getUserConstellation:  For variables, look at type GetUserConstellationVars in ../index.d.ts
const { data } = await GetUserConstellation(dataConnect, getUserConstellationVars);

// Operation getLessonDetails:  For variables, look at type GetLessonDetailsVars in ../index.d.ts
const { data } = await GetLessonDetails(dataConnect, getLessonDetailsVars);


```