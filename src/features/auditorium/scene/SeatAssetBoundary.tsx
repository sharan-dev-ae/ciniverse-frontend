import { Component, type ErrorInfo, type ReactNode } from 'react'

export class SeatAssetBoundary extends Component<{fallback:ReactNode;children:ReactNode},{failed:boolean}>{
  state={failed:false}
  static getDerivedStateFromError(){return{failed:true}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Cinema chair asset failed to render.',error,info)}
  render(){return this.state.failed?this.props.fallback:this.props.children}
}
