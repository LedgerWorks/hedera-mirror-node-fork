/*-
 * ‌
 * Hedera Mirror Node
 * ​
 * Copyright (C) 2019 - 2022 Hedera Hashgraph, LLC
 * ​
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ‍
 */

'use strict';

const _ = require('lodash');

const {
  response: {
    limit: {default: defaultLimit},
  },
} = require('../config');
const constants = require('../constants');
const utils = require('../utils');

const {Nft} = require('../model');
const {EntityService, NftService} = require('../service');
const {NftViewModel} = require('../viewmodel');

// errors
const {InvalidArgumentError} = require('../errors/invalidArgumentError');

const tokenSerialLowerRequirementMessage =
  'A lower bound serialnumber filter requires a lower bound tokenId parameter filter';
const tokenSerialUpperRequirementMessage =
  'An upper bound serialnumber filter requires an upper bound tokenId parameter filter';

const updateConditionsAndParamsWithValues = (
  filter,
  existingParams,
  existingConditions,
  fullName,
  position = existingParams.length
) => {
  existingParams.push(filter.value);
  existingConditions.push(`${fullName}${filter.operator}$${position}`);
};

/**
 * Extracts SQL where conditions, params, order, and limit
 *
 * @param {[]} filters parsed and validated filters
 * @param {Number} accountId parsed accountId from path
 * @param {Number} startPosition param index start position
 */
const extractNftsQuery = (filters, accountId, startPosition = 1) => {
  let limit = defaultLimit;
  let order = constants.orderFilterValues.DESC;
  const conditions = [`${Nft.ACCOUNT_ID} = $${startPosition}`];
  const params = [accountId];

  for (const filter of filters) {
    if (_.isNil(filter)) {
      continue;
    }

    switch (filter.key) {
      case constants.filterKeys.SERIAL_NUMBER:
        updateConditionsAndParamsWithValues(
          filter,
          params,
          conditions,
          Nft.SERIAL_NUMBER,
          startPosition + conditions.length
        );
        break;
      case constants.filterKeys.TOKEN_ID:
        updateConditionsAndParamsWithValues(
          filter,
          params,
          conditions,
          Nft.TOKEN_ID,
          startPosition + conditions.length
        );
        break;
      case constants.filterKeys.LIMIT:
        limit = filter.value;
        break;
      case constants.filterKeys.ORDER:
        order = filter.value;
        break;
      default:
        break;
    }
  }

  return {
    conditions,
    params,
    order,
    limit,
  };
};

const cacheAndUpdateFilter = (cachedFilter, filter, newOperator = null) => {
  Object.assign(cachedFilter, filter);
  if (!_.isNil(newOperator)) {
    cachedFilter.operator = newOperator;
  }
};

const validateSupportedOperator = (operator) => {
  if (utils.opsMap.ne === operator) {
    throw new InvalidArgumentError(`Not equals (ne) comparison operator is not supported`);
  }
};

const validateSerialNumberTokenFilterCombo = (serialNumberBound, tokenIdBound, message) => {
  if (!_.isEmpty(serialNumberBound) && _.isEmpty(tokenIdBound)) {
    throw new InvalidArgumentError(message);
  }
};

const retrieveNftComponentQuery = (firstBoundary, secondBoundary, orderFilter, limitFilter, accountId, paramCount) => {
  return !_.isEmpty(firstBoundary) || !_.isEmpty(secondBoundary)
    ? extractNftsQuery([firstBoundary, secondBoundary, orderFilter, limitFilter], accountId, paramCount)
    : null;
};

/**
 * Extract multiple queries to be combined in union
 * @param {Object} filters req filters
 * @param {*} accountId Encoded owner entityId
 * @returns {{lower: Object, inner: Object, upper: Object, order: 'asc'|'desc', limit: number}}
 */
const extractNftMultiUnionQuery = (filters, accountId) => {
  const lowerTokenIdBound = {};
  const lowerSerialNumberBound = {};
  const upperTokenIdBound = {};
  const upperSerialNumberBound = {};
  const inclusiveLowerTokenIdBound = {};
  const inclusiveUpperTokenIdBound = {};
  let orderFilter = null;
  let limitFilter = null;
  let noFilterQuery = true;
  let limit = defaultLimit;
  let order = constants.orderFilterValues.DESC;
  let hasSerialNumber = false;
  let hasTokenNumber = false;
  const oneOperatorValues = {};

  for (const filter of filters) {
    validateSupportedOperator(filter.operator);

    // limit all query filters eq|lt(e)|gt(e) filters to one occurence
    validateSingleFilterKeyOccurence(oneOperatorValues, filter);
    oneOperatorValues[getFilterKeyOpString(filter)] = true;

    switch (filter.key) {
      case constants.filterKeys.SERIAL_NUMBER:
        if (utils.isRegexMatch(constants.queryParamOperatorPatterns.ltorlte, filter.operator)) {
          cacheAndUpdateFilter(upperSerialNumberBound, filter);
          noFilterQuery = false;
        } else if (utils.isRegexMatch(constants.queryParamOperatorPatterns.gtorgte, filter.operator)) {
          cacheAndUpdateFilter(lowerSerialNumberBound, filter);
          noFilterQuery = false;
        }
        hasSerialNumber = true;
        break;
      case constants.filterKeys.TOKEN_ID:
        if (utils.isRegexMatch(constants.queryParamOperatorPatterns.ltorlte, filter.operator)) {
          if (utils.opsMap.lte === filter.operator) {
            // cache filter as an upper token bound for equality case
            cacheAndUpdateFilter(upperTokenIdBound, filter, utils.opsMap.eq);
          }

          // cache filter as an upper token bound for less than case
          cacheAndUpdateFilter(inclusiveUpperTokenIdBound, filter, utils.opsMap.lt);
          noFilterQuery = false;
        } else if (utils.isRegexMatch(constants.queryParamOperatorPatterns.gtorgte, filter.operator)) {
          if (utils.opsMap.gte === filter.operator) {
            // cache filter as an lower token bound for equality case
            cacheAndUpdateFilter(lowerTokenIdBound, filter, utils.opsMap.eq);
          }

          // cache filter as an upper token bound for greater than case
          cacheAndUpdateFilter(inclusiveLowerTokenIdBound, filter, utils.opsMap.gt);
          noFilterQuery = false;
        }
        hasTokenNumber = true;
        break;
      case constants.filterKeys.LIMIT:
        limitFilter = filter;
        limit = filter.value;
        break;
      case constants.filterKeys.ORDER:
        orderFilter = filter;
        order = filter.value;
        break;
      default:
        break;
    }
  }

  // validate filter combination occurences
  if (hasSerialNumber && !hasTokenNumber) {
    throw new InvalidArgumentError(`Cannot search NFTs with serialnumber without a tokenId parameter filter`);
  }

  validateSerialNumberTokenFilterCombo(lowerSerialNumberBound, lowerTokenIdBound, tokenSerialLowerRequirementMessage);

  validateSerialNumberTokenFilterCombo(upperSerialNumberBound, upperTokenIdBound, tokenSerialUpperRequirementMessage);

  let lower = null;
  let inner = null;
  let upper = null;
  let paramCount = 0;
  if (noFilterQuery) {
    lower = extractNftsQuery(filters, accountId);
  } else {
    lower = retrieveNftComponentQuery(lowerTokenIdBound, lowerSerialNumberBound, orderFilter, limitFilter, accountId);

    // account for non zero based psql index and limit param index position to be injected
    paramCount = _.isNil(lower) ? 1 : lower.params.length + 2;
    inner = retrieveNftComponentQuery(
      inclusiveLowerTokenIdBound,
      inclusiveUpperTokenIdBound,
      orderFilter,
      limitFilter,
      accountId,
      paramCount
    );

    // account for limit param index position to be injected
    paramCount = _.isNil(inner) ? paramCount : paramCount + inner.params.length + 1;
    upper = retrieveNftComponentQuery(
      upperTokenIdBound,
      upperSerialNumberBound,
      orderFilter,
      limitFilter,
      accountId,
      paramCount
    );
  }

  return {
    lower,
    inner,
    upper,
    order,
    limit,
  };
};

/**
 * Retrieve a unique identifying string for a filter using it's key and comparison operator
 * e.g. 'token.id-=', 'serialnumber->='
 * Note gt & gte are equivalent, as are lt & lte when mergeOrEqualComparisons  is true
 * @param {Object} filter
 * @param {boolean} mergeOrEqualComparisons flag to treat gt & gte as equivalent, as well as lt & lte
 * @returns {string}
 */
const getFilterKeyOpString = (filter, mergeOrEqualComparisons = true) => {
  const rangeRegex = /(>|<)(=)?/;
  const comparisonString = mergeOrEqualComparisons ? filter.operator.replace(rangeRegex, '$1') : filter.operator;
  return `${filter.key}-${comparisonString.trim()}`;
};

/**
 * Verify there's only a single occurence of a given non-eq filter in the map using its unique string identifier
 * @param {Object} filterMap Map of observer filters
 * @param {String} filter Current filter
 */
const validateSingleFilterKeyOccurence = (filterMap, filter) => {
  if (filterMap[getFilterKeyOpString(filter)]) {
    throw new InvalidArgumentError(`Multiple range params not allowed for ${filter.key}`);
  }
};

/**
 * Handler function for /accounts/:accountAliasOrAccountId/nfts API
 * @param {Request} req HTTP request object
 * @param {Response} res HTTP response object
 * @returns {Promise<void>}
 */
const getNftsByAccountId = async (req, res) => {
  // extract filters from query param
  let accountId = null;
  try {
    accountId = await EntityService.getEncodedIdAccountIdOrAlias(req.params.accountAliasOrAccountId);
  } catch (err) {
    if (err instanceof InvalidArgumentError) {
      throw InvalidArgumentError.forParams(constants.filterKeys.ACCOUNT_ID_OR_ALIAS);
    }

    // rethrow any other error
    throw err;
  }

  // extract filters from query param
  const filters = await utils.buildAndValidateFilters(req.query);

  // build multi union query and request applicable rows
  const {lower, inner, upper, order, limit} = extractNftMultiUnionQuery(filters, accountId);
  const nfts = await NftService.getNftOwnership(lower, inner, upper, order, limit);

  const response = {
    nfts: nfts.map((nft) => new NftViewModel(nft)),
    links: {
      next: null,
    },
  };

  if (!_.isEmpty(response.nfts)) {
    const lastRow = _.last(response.nfts);
    const last = {
      [constants.filterKeys.TOKEN_ID]: lastRow.token_id,
      [constants.filterKeys.SERIAL_NUMBER]: lastRow.serial_number,
    };
    response.links.next = utils.getPaginationLink(req, response.nfts.length !== limit, last, order, {
      [constants.filterKeys.TOKEN_ID]: true,
    });
  }

  res.locals[constants.responseDataLabel] = response;
};

module.exports = {
  getNftsByAccountId,
};

if (utils.isTestEnv()) {
  Object.assign(module.exports, {
    extractNftsQuery,
    extractNftMultiUnionQuery,
    getFilterKeyOpString,
    validateSingleFilterKeyOccurence,
  });
}
