import { fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs';

export const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, maximum_interval: 36500 })
);

export { Rating, State, type Card };
