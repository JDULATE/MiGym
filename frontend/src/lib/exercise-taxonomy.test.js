import { describe, expect, it } from 'vitest'
import {
  DIFFICULTY_LEVELS, DIFFICULTY_OVERRIDES, MOVEMENT_GROUPS,
  alternativesOf, difficultyOf, exerciseTypeTags, movementGroup,
} from './exercise-taxonomy.js'

const bench = { id: '0025', n: 'barbell bench press', bp: 'chest', tg: 'pectoralis major', eq: 'barbell', sm: ['triceps', 'deltoids'] }
const dbBench = { id: '0293', n: 'dumbbell bench press', bp: 'chest', tg: 'pectoralis major', eq: 'dumbbell', sm: ['triceps', 'deltoids'] }
const row = { id: '0027', n: 'barbell bent over row', bp: 'back', tg: 'upper back', eq: 'barbell', sm: ['biceps', 'rear deltoids'] }
const latPulldown = { id: '0861', n: 'cable seated row', bp: 'back', tg: 'upper back', eq: 'cable', sm: ['biceps', 'rear deltoids'] }
const run = { id: '9001', n: 'treadmill run', bp: 'cardio', tg: '', eq: '' }
const plank = { id: '9002', n: 'plank', bp: 'waist', tg: 'abs', eq: 'body weight' }
const squat = { id: '0043', n: 'barbell squat', bp: 'upper legs', tg: 'quadriceps', eq: 'barbell', sm: ['glutes'] }

describe('movementGroup', () => {
  it('groups by target muscle first', () => {
    expect(movementGroup(bench)).toBe('push')
    expect(movementGroup(row)).toBe('pull')
    expect(movementGroup(squat)).toBe('legs')
    expect(movementGroup(plank)).toBe('core')
    expect(movementGroup(run)).toBe('cardio')
  })

  it('falls back to body part when the target is empty (custom exercises)', () => {
    expect(movementGroup({ id: 'c1', n: 'My machine press', bp: 'chest', eq: 'custom' })).toBe('push')
    expect(movementGroup({ id: 'c2', n: 'Mystery', bp: '', eq: '' })).toBeNull()
    expect(movementGroup(null)).toBeNull()
  })

  it('exposes exactly the spec browse groups', () => {
    expect(MOVEMENT_GROUPS).toEqual(['push', 'pull', 'legs', 'core', 'cardio'])
  })
})

describe('exerciseTypeTags', () => {
  it('derives the derivable categories honestly', () => {
    expect(exerciseTypeTags(bench)).toEqual(['free weight'])
    expect(exerciseTypeTags(latPulldown)).toEqual(['cable'])
    expect(exerciseTypeTags(plank)).toEqual(['bodyweight'])
    expect(exerciseTypeTags(run)).toEqual(['cardio'])
    expect(exerciseTypeTags({ id: 'm1', bp: 'chest', eq: 'leverage machine' })).toEqual(['machine'])
  })

  it('stays silent for custom exercises with no equipment class', () => {
    expect(exerciseTypeTags({ id: 'c1', bp: 'chest', eq: 'custom' })).toEqual([])
    expect(exerciseTypeTags(null)).toEqual([])
  })
})

describe('difficultyOf', () => {
  it('follows how guided the equipment is', () => {
    expect(difficultyOf(latPulldown)).toBe('beginner')
    expect(difficultyOf(dbBench)).toBe('intermediate')
    expect(difficultyOf(bench)).toBe('advanced')
  })

  it('gives no verdict where it has no basis', () => {
    expect(difficultyOf(run)).toBeNull()
    expect(difficultyOf({ id: 'c1', bp: 'chest', eq: 'custom' })).toBeNull()
    expect(difficultyOf(null)).toBeNull()
  })

  it('lets curated overrides win and keeps levels aligned', () => {
    DIFFICULTY_OVERRIDES['0025'] = 'intermediate'
    expect(difficultyOf(bench)).toBe('intermediate')
    delete DIFFICULTY_OVERRIDES['0025']
    expect(DIFFICULTY_LEVELS).toEqual(['beginner', 'intermediate', 'advanced'])
  })
})

describe('alternativesOf', () => {
  const catalogue = [bench, dbBench, row, latPulldown, squat, plank]

  it('prefers same target inside the same movement group', () => {
    const alts = alternativesOf(bench, catalogue)
    expect(alts[0].id).toBe('0293')            // same target + same group + shared secondaries
    expect(alts.map(a => a.id)).not.toContain('0025')
    expect(alts.map(a => a.id)).not.toContain('9002')
  })

  it('never recommends across unrelated groups', () => {
    const alts = alternativesOf(plank, catalogue)
    expect(alts).toHaveLength(0)               // nothing else trains abs here
  })

  it('ranks shared secondary muscles above a body-part coincidence', () => {
    const alts = alternativesOf(row, catalogue)
    // cable seated row shares target AND secondaries; the chest work does not qualify
    expect(alts.map(a => a.id)).toEqual(['0861'])
  })

  it('is deterministic regardless of catalogue order', () => {
    const a = alternativesOf(bench, [dbBench, squat, row]).map(x => x.id)
    const b = alternativesOf(bench, [squat, row, dbBench]).map(x => x.id)
    expect(a).toEqual(b)
  })
})
