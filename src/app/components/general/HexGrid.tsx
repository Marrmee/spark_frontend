"use client"

import { useEffect, useRef } from "react"

export default function HexGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to viewport size, not page size
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Hex grid properties
    const hexSize = 40
    const hexHeight = hexSize * Math.sqrt(3)
    const hexWidth = hexSize * 2
    const hexVerticalSpacing = hexHeight
    const hexHorizontalSpacing = hexWidth * 0.75

    // Draw hexagon function
    const drawHexagon = (x: number, y: number) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i
        const xPos = x + hexSize * Math.cos(angle)
        const yPos = y + hexSize * Math.sin(angle)
        if (i === 0) {
          ctx.moveTo(xPos, yPos)
        } else {
          ctx.lineTo(xPos, yPos)
        }
      }
      ctx.closePath()
      ctx.strokeStyle = "rgba(69, 95, 255, 0.1)" // seaBlue-500 with low opacity
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw grid
    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const rows = Math.ceil(canvas.height / hexVerticalSpacing) + 1
      const cols = Math.ceil(canvas.width / hexHorizontalSpacing) + 1

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * hexHorizontalSpacing + (row % 2 === 0 ? 0 : hexHorizontalSpacing / 2)
          const y = row * hexVerticalSpacing
          drawHexagon(x, y)
        }
      }
    }

    drawGrid()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
    }
  }, [])

  // Use fixed positioning to keep the canvas covering just the viewport
  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-screen h-screen" />
}
