import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for the system message
// In production, this should be stored in a database
let systemMessage = {
  enabled: false,
  message: "",
  showOnDashboard: true,
  showOnLogin: true,
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: systemMessage,
    })
  } catch (error) {
    console.error("Error fetching system message:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch system message",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestorEmail, enabled, message, showOnDashboard, showOnLogin } = body

    // Verify admin access
    if (!requestorEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Requestor email is required",
        },
        { status: 400 },
      )
    }

    // Update system message
    systemMessage = {
      enabled: enabled ?? systemMessage.enabled,
      message: message ?? systemMessage.message,
      showOnDashboard: showOnDashboard ?? systemMessage.showOnDashboard,
      showOnLogin: showOnLogin ?? systemMessage.showOnLogin,
    }

    return NextResponse.json({
      success: true,
      data: systemMessage,
    })
  } catch (error) {
    console.error("Error updating system message:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update system message",
      },
      { status: 500 },
    )
  }
}
