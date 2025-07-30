/**
 * CSS变量管理器 - 负责动态管理和应用CSS变量
 */

import type { Theme, TypewriterTheme } from '../types/theme'

export interface CSSVariableGroup {
  prefix: string
  variables: Record<string, string>
}

export class CSSVariableManager {
  private root: HTMLElement
  private appliedVariables: Set<string> = new Set()
  private variableGroups: Map<string, CSSVariableGroup> = new Map()

  constructor(root: HTMLElement = document.documentElement) {
    this.root = root
    this.initializeBaseVariables()
  }

  /**
   * 应用主题的所有CSS变量
   */
  applyThemeVariables(theme: Theme): void {
    // 清除之前的主题变量
    this.clearThemeVariables()

    // 应用基础主题变量
    this.applyColorVariables(theme)
    this.applyFontVariables(theme)
    this.applySpacingVariables(theme)
    this.applyBorderVariables(theme)
    this.applyShadowVariables(theme)
    this.applyAnimationVariables(theme)

    // 如果是打字机主题，应用特殊效果变量
    if (this.isTypewriterTheme(theme)) {
      this.applyTypewriterVariables(theme)
    }

    // 应用主题标识变量
    this.applyThemeMetaVariables(theme)
  }

  /**
   * 应用颜色变量
   */
  private applyColorVariables(theme: Theme): void {
    const colorGroup: CSSVariableGroup = {
      prefix: '--theme-color',
      variables: {}
    }

    Object.entries(theme.colors).forEach(([key, value]) => {
      const varName = `${colorGroup.prefix}-${this.kebabCase(key)}`
      colorGroup.variables[varName] = value
      this.setVariable(varName, value)
    })

    this.variableGroups.set('colors', colorGroup)
  }

  /**
   * 应用字体变量
   */
  private applyFontVariables(theme: Theme): void {
    const fontGroup: CSSVariableGroup = {
      prefix: '--theme-font',
      variables: {}
    }

    Object.entries(theme.fonts).forEach(([key, value]) => {
      const varName = `${fontGroup.prefix}-${this.kebabCase(key)}`
      fontGroup.variables[varName] = value
      this.setVariable(varName, value)
    })

    this.variableGroups.set('fonts', fontGroup)
  }

  /**
   * 应用间距变量
   */
  private applySpacingVariables(theme: Theme): void {
    const spacingGroup: CSSVariableGroup = {
      prefix: '--theme-spacing',
      variables: {}
    }

    Object.entries(theme.spacing).forEach(([key, value]) => {
      const varName = `${spacingGroup.prefix}-${this.kebabCase(key)}`
      spacingGroup.variables[varName] = value
      this.setVariable(varName, value)
    })

    this.variableGroups.set('spacing', spacingGroup)
  }

  /**
   * 应用边框变量
   */
  private applyBorderVariables(theme: Theme): void {
    const borderGroup: CSSVariableGroup = {
      prefix: '--theme-border',
      variables: {}
    }

    Object.entries(theme.borders).forEach(([key, value]) => {
      const varName = `${borderGroup.prefix}-${this.kebabCase(key)}`
      borderGroup.variables[varName] = value
      this.setVariable(varName, value)
    })

    this.variableGroups.set('borders', borderGroup)
  }

  /**
   * 应用阴影变量
   */
  private applyShadowVariables(theme: Theme): void {
    const shadowGroup: CSSVariableGroup = {
      prefix: '--theme-shadow',
      variables: {}
    }

    Object.entries(theme.shadows).forEach(([key, value]) => {
      const varName = `${shadowGroup.prefix}-${this.kebabCase(key)}`
      shadowGroup.variables[varName] = value
      this.setVariable(varName, value)
    })

    this.variableGroups.set('shadows', shadowGroup)
  }

  /**
   * 应用动画变量
   */
  private applyAnimationVariables(theme: Theme): void {
    const animationGroup: CSSVariableGroup = {
      prefix: '--theme-animation',
      variables: {}
    }

    Object.entries(theme.animations).forEach(([key, value]) => {
      const varName = `${animationGroup.prefix}-${this.kebabCase(key)}`
      animationGroup.variables[varName] = value
      this.setVariable(varName, value)
    })

    this.variableGroups.set('animations', animationGroup)
  }

  /**
   * 应用打字机效果变量
   */
  private applyTypewriterVariables(theme: TypewriterTheme): void {
    const typewriterGroup: CSSVariableGroup = {
      prefix: '--typewriter',
      variables: {}
    }

    const effects = theme.typewriterEffects

    // 焦点行效果
    if (effects.focusLine.enabled) {
      this.setTypewriterVariable(typewriterGroup, 'focus-enabled', '1')
      this.setTypewriterVariable(typewriterGroup, 'focus-color', effects.focusLine.highlightColor)
      this.setTypewriterVariable(typewriterGroup, 'focus-fade-distance', `${effects.focusLine.fadeDistance}px`)
      this.setTypewriterVariable(typewriterGroup, 'focus-gradient-intensity', `${effects.focusLine.gradientIntensity}`)
      this.setTypewriterVariable(typewriterGroup, 'focus-center', effects.focusLine.centerOnFocus ? '1' : '0')
      
      if (effects.focusLine.markerColor) {
        this.setTypewriterVariable(typewriterGroup, 'focus-marker-color', effects.focusLine.markerColor)
      }
      if (effects.focusLine.markerWidth) {
        this.setTypewriterVariable(typewriterGroup, 'focus-marker-width', effects.focusLine.markerWidth)
      }
    } else {
      this.setTypewriterVariable(typewriterGroup, 'focus-enabled', '0')
    }

    // 渐变淡化效果
    if (effects.fadeEffect.enabled) {
      this.setTypewriterVariable(typewriterGroup, 'fade-enabled', '1')
      this.setTypewriterVariable(typewriterGroup, 'fade-opacity', `${effects.fadeEffect.fadeOpacity}`)
      this.setTypewriterVariable(typewriterGroup, 'fade-distance', effects.fadeEffect.fadeDistance)
      this.setTypewriterVariable(typewriterGroup, 'fade-duration', effects.fadeEffect.animationDuration)
      this.setTypewriterVariable(typewriterGroup, 'fade-easing', effects.fadeEffect.easing)
    } else {
      this.setTypewriterVariable(typewriterGroup, 'fade-enabled', '0')
    }

    // 视觉效果
    const visual = effects.visualEffects
    this.setTypewriterVariable(typewriterGroup, 'scan-lines', visual.scanLines ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'glow-effect', visual.glowEffect ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'breathing-cursor', visual.breathingCursor ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'page-flip', visual.pageFlipAnimation ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'noise-texture', visual.noiseTexture ? '1' : '0')

    if (visual.paperTexture) {
      this.setTypewriterVariable(typewriterGroup, 'paper-texture', `url(${visual.paperTexture})`)
    }
    if (visual.glowColor) {
      this.setTypewriterVariable(typewriterGroup, 'glow-color', visual.glowColor)
    }
    if (visual.glowIntensity !== undefined) {
      this.setTypewriterVariable(typewriterGroup, 'glow-intensity', `${visual.glowIntensity}`)
    }
    if (visual.breathingDuration) {
      this.setTypewriterVariable(typewriterGroup, 'breathing-duration', visual.breathingDuration)
    }
    if (visual.scanLineOpacity !== undefined) {
      this.setTypewriterVariable(typewriterGroup, 'scan-line-opacity', `${visual.scanLineOpacity}`)
    }
    if (visual.scanLineSpeed) {
      this.setTypewriterVariable(typewriterGroup, 'scan-line-speed', visual.scanLineSpeed)
    }

    // 动态效果
    const dynamic = effects.dynamicEffects
    this.setTypewriterVariable(typewriterGroup, 'color-temperature', dynamic.colorTemperature ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'auto-brightness', dynamic.autoAdjustBrightness ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'time-based', dynamic.timeBasedTheme ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'smart-focus', dynamic.smartFocus ? '1' : '0')
    this.setTypewriterVariable(typewriterGroup, 'paragraph-expansion', dynamic.paragraphExpansion ? '1' : '0')

    if (dynamic.temperatureRange) {
      this.setTypewriterVariable(typewriterGroup, 'temp-min', `${dynamic.temperatureRange[0]}`)
      this.setTypewriterVariable(typewriterGroup, 'temp-max', `${dynamic.temperatureRange[1]}`)
    }
    if (dynamic.brightnessRange) {
      this.setTypewriterVariable(typewriterGroup, 'brightness-min', `${dynamic.brightnessRange[0]}`)
      this.setTypewriterVariable(typewriterGroup, 'brightness-max', `${dynamic.brightnessRange[1]}`)
    }

    this.variableGroups.set('typewriter', typewriterGroup)
  }

  /**
   * 应用主题元数据变量
   */
  private applyThemeMetaVariables(theme: Theme): void {
    const metaGroup: CSSVariableGroup = {
      prefix: '--theme-meta',
      variables: {}
    }

    this.setVariable('--theme-meta-id', theme.id)
    this.setVariable('--theme-meta-name', `"${theme.name}"`)
    this.setVariable('--theme-meta-dark', theme.isDark ? '1' : '0')
    
    if (theme.category) {
      this.setVariable('--theme-meta-category', theme.category)
    }

    metaGroup.variables['--theme-meta-id'] = theme.id
    metaGroup.variables['--theme-meta-name'] = `"${theme.name}"`
    metaGroup.variables['--theme-meta-dark'] = theme.isDark ? '1' : '0'

    this.variableGroups.set('meta', metaGroup)
  }

  /**
   * 设置打字机变量的辅助方法
   */
  private setTypewriterVariable(group: CSSVariableGroup, key: string, value: string): void {
    const varName = `${group.prefix}-${key}`
    group.variables[varName] = value
    this.setVariable(varName, value)
  }

  /**
   * 设置CSS变量
   */
  private setVariable(name: string, value: string): void {
    this.root.style.setProperty(name, value)
    this.appliedVariables.add(name)
  }

  /**
   * 移除CSS变量
   */
  // private removeVariable(name: string): void {
  //   this.root.style.removeProperty(name)
  //   this.appliedVariables.delete(name)
  // }

  /**
   * 清除主题变量
   */
  private clearThemeVariables(): void {
    // 清除所有已应用的变量
    this.appliedVariables.forEach(varName => {
      this.root.style.removeProperty(varName)
    })
    this.appliedVariables.clear()
    this.variableGroups.clear()
  }

  /**
   * 初始化基础变量
   */
  private initializeBaseVariables(): void {
    // 设置一些基础的CSS变量
    this.setVariable('--theme-transition-duration', '0.3s')
    this.setVariable('--theme-transition-easing', 'ease')
    this.setVariable('--theme-border-radius-base', '8px')
  }

  /**
   * 获取变量值
   */
  getVariable(name: string): string {
    return getComputedStyle(this.root).getPropertyValue(name).trim()
  }

  /**
   * 检查变量是否存在
   */
  hasVariable(name: string): boolean {
    return this.appliedVariables.has(name)
  }

  /**
   * 获取所有变量组
   */
  getVariableGroups(): Map<string, CSSVariableGroup> {
    return new Map(this.variableGroups)
  }

  /**
   * 动态更新变量
   */
  updateVariable(name: string, value: string): void {
    this.setVariable(name, value)
  }

  /**
   * 批量更新变量
   */
  updateVariables(variables: Record<string, string>): void {
    Object.entries(variables).forEach(([name, value]) => {
      this.setVariable(name, value)
    })
  }

  /**
   * 判断是否为打字机主题
   */
  private isTypewriterTheme(theme: Theme): theme is TypewriterTheme {
    return theme.category === 'typewriter' && 'typewriterEffects' in theme
  }

  /**
   * 转换为kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  }
}

// 创建全局CSS变量管理器实例
export const cssVariableManager = new CSSVariableManager()

// CSSVariableGroup类型已在上面定义并导出
