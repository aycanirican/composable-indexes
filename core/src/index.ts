/**
 * @module API Documentation
 */

export {
  Collection,
  ConflictException,
  ConditionFailedException,
} from "./core/Collection";
export {
  Index,
  UnregisteredIndex,
  premap,
  group,
} from "./core/Index";
export {
  Id,
  Item,
} from "./core/simple_types";

export * from "./indexes";