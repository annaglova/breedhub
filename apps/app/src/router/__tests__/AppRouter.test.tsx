import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "../AppRouter";

const routeRecords = vi.hoisted(() => [] as any[]);
const spacePageMock = vi.hoisted(() => vi.fn(() => null));
const appStoreMock = vi.hoisted(() => ({
  isDataLoaded: { value: true },
  workspaces: { value: [] as any[] },
}));

vi.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }: any) => children,
  Routes: ({ children }: any) => children,
  Route: (props: any) => {
    routeRecords.push(props);
    return props.children ?? null;
  },
  Navigate: () => null,
  Outlet: () => null,
}));

vi.mock("@preact/signals-react/runtime", () => ({
  useSignals: vi.fn(),
}));

vi.mock("@breedhub/rxdb-store", () => ({
  appStore: appStoreMock,
}));

vi.mock("@/layouts/AppLayout", () => ({
  AppLayout: () => null,
}));

vi.mock("@/components/auth/AuthGuard", () => ({
  AuthGuard: ({ children }: any) => children,
}));

vi.mock("@/components/error-boundary/ErrorBoundary", () => ({
  PageErrorBoundary: ({ children }: any) => children,
}));

vi.mock("@/pages/SpacePage", () => ({
  SpacePage: spacePageMock,
}));

vi.mock("@/pages/SlugResolver", () => ({
  SlugResolver: () => null,
}));

vi.mock("@/pages/EditPageResolver", () => ({
  EditPageResolver: () => null,
}));

vi.mock("@/pages/CreatePageResolver", () => ({
  CreatePageResolver: () => null,
}));

vi.mock("@/pages/TabPageResolver", () => ({
  TabPageResolver: () => null,
}));

vi.mock("@shared/components/auth/AuthFormSkeleton", () => ({
  SignInSkeleton: () => null,
  SignUpSkeleton: () => null,
  ForgotPasswordSkeleton: () => null,
  ResetPasswordSkeleton: () => null,
}));

vi.mock("@/pages/pageRegistry", () => ({
  getPage: () => null,
  PageNotFound: () => null,
}));

vi.mock("@/utils/workspace-items", () => ({
  getWorkspaceItems: (workspace: any) => Object.values(workspace.spaces ?? {}),
  getDefaultWorkspaceItem: (items: any[]) => items[0],
  resolveItemPath: (workspacePath: string, item: any) =>
    `${workspacePath.replace(/^\//, "")}/${item.slug}`,
}));

function renderSpaceRoutes(workspaces: any[]) {
  routeRecords.length = 0;
  appStoreMock.isDataLoaded.value = true;
  appStoreMock.workspaces.value = workspaces;

  render(<AppRouter />);

  return routeRecords.filter((route) => route.element?.type === spacePageMock);
}

describe("AppRouter space routes", () => {
  beforeEach(() => {
    routeRecords.length = 0;
    spacePageMock.mockClear();
    appStoreMock.isDataLoaded.value = true;
    appStoreMock.workspaces.value = [];
  });

  it("renders same-entity spaces from different workspaces with distinct object-key route ids", () => {
    const routes = renderSpaceRoutes([
      {
        id: "public",
        path: "/",
        isPublic: true,
        spaces: {
          config_space_111: {
            id: "pets",
            slug: "pets",
            entitySchemaName: "pet",
            isPublic: true,
          },
        },
      },
      {
        id: "my",
        path: "/my",
        isPublic: false,
        spaces: {
          space_222: {
            id: "pets",
            slug: "pets",
            entitySchemaName: "pet",
          },
        },
      },
    ]);

    expect(routes).toHaveLength(2);
    expect(
      routes.map((route) => ({
        path: route.path,
        spaceId: route.element.props.spaceId,
        entityType: route.element.props.entityType,
      })),
    ).toEqual([
      {
        path: "pets/*",
        spaceId: "config_space_111",
        entityType: "pet",
      },
      {
        path: "my/pets/*",
        spaceId: "space_222",
        entityType: "pet",
      },
    ]);
  });

  it("renders a simple single-workspace space route using its object key", () => {
    const routes = renderSpaceRoutes([
      {
        id: "public",
        path: "/",
        spaces: {
          config_space_breeds: {
            id: "breeds",
            slug: "breeds",
            entitySchemaName: "breed",
          },
        },
      },
    ]);

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe("breeds/*");
    expect(routes[0].element.props).toMatchObject({
      spaceId: "config_space_breeds",
      entityType: "breed",
    });
  });
});
